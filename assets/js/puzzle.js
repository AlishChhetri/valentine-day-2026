// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  puzzle: {
    name: 'valentines_day_2026',
    folder: 'valentines_day_2026',
    image: 'puzzle.png',
    downloads: 'valentines_day_2026.zip'
  },
  paths: {
    base: 'assets/puzzle-boards'
  },
  grid: {
    size: 5, // 3 for testing, 5 for production
    gap: 2,
    padding: 16,
    scaleFactor: 1.25
  },
  animation: {
    swapDuration: 300,
    winDelay: 500,
    confettiCount: 140
  },
  confetti: {
    colors: ['#ff0000', '#ff69b4', '#ff1493', '#ffc0cb', '#ff6b9d', '#ffd166', '#f78c6b'],
    sizeRange: [6, 12],
    driftRange: [-100, 100],
    durationRange: [2.5, 5],
    delayRange: [0, 0.6]
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.originalImage = null;
    this.currentBoardName = '';
    this.currentDownloadPath = '';
    this.gridSize = CONFIG.grid.size;
    this.pieces = [];
    this.pieceSize = 0;
    this.puzzleWidth = 0;
    this.puzzleHeight = 0;
  }

  setPuzzleData(image, boardName, downloadPath) {
    this.originalImage = image;
    this.currentBoardName = boardName;
    this.currentDownloadPath = downloadPath;
  }

  setDimensions(width, height, pieceSize) {
    this.puzzleWidth = width;
    this.puzzleHeight = height;
    this.pieceSize = pieceSize;
  }

  initializePieces() {
    this.pieces = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.pieces.push({ correctRow: row, correctCol: col });
      }
    }
    this.shufflePieces();
  }

  shufflePieces() {
    for (let i = this.pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
    }
  }

  swapPieces(index1, index2) {
    if (index1 === index2) return false;
    [this.pieces[index1], this.pieces[index2]] = [this.pieces[index2], this.pieces[index1]];
    return true;
  }

  isPuzzleSolved() {
    return this.pieces.every((piece, index) => {
      const expectedRow = Math.floor(index / this.gridSize);
      const expectedCol = index % this.gridSize;
      return piece.correctRow === expectedRow && piece.correctCol === expectedCol;
    });
  }
}

// ============================================================================
// DOM MANAGEMENT
// ============================================================================

class DOMManager {
  constructor() {
    this.elements = {};
  }

  cacheElements() {
    this.elements = {
      puzzleFrame: document.querySelector('.puzzle-frame'),
      puzzleGrid: document.getElementById('puzzleGrid'),
      winModal: document.getElementById('winModal'),
      downloadBtn: document.getElementById('downloadBtn'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      completedImage: document.getElementById('completedImage')
    };

    // Validate critical elements
    const requiredElements = ['puzzleFrame', 'puzzleGrid', 'winModal'];
    requiredElements.forEach(key => {
      if (!this.elements[key]) {
        throw new Error(`Required element not found: ${key}`);
      }
    });
  }

  get(elementName) {
    return this.elements[elementName];
  }

  clearPuzzleGrid() {
    this.elements.puzzleGrid.innerHTML = '';
  }

  setPuzzleGridStyle(width, height, gridSize, pieceSize) {
    const grid = this.elements.puzzleGrid;
    grid.style.width = `${width}px`;
    grid.style.height = `${height}px`;
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${pieceSize}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${pieceSize}px)`;
  }

  setBackgroundImage(imagePath) {
    document.documentElement.style.setProperty('--bg-image', `url('${imagePath}')`);
  }

  showWinModal() {
    this.elements.winModal.classList.add('show');
  }

  getAllPuzzlePieces() {
    return this.elements.puzzleGrid.querySelectorAll('.puzzle-piece');
  }

  clearHighlights() {
    this.getAllPuzzlePieces().forEach(piece => {
      piece.classList.remove('highlight');
    });
  }
}

// ============================================================================
// PUZZLE RENDERER
// ============================================================================

class PuzzleRenderer {
  constructor(domManager, gameState) {
    this.dom = domManager;
    this.state = gameState;
  }

  calculateLayout(image, gridSize) {
    const frameRect = this.dom.get('puzzleFrame').getBoundingClientRect();
    const { gap, padding, scaleFactor } = CONFIG.grid;
    const gapTotal = (gridSize - 1) * gap;
    const buffer = 40;
    
    const maxWidth = (frameRect.width || window.innerWidth) - buffer;
    const maxHeight = (frameRect.height || window.innerHeight) - buffer;
    
    const imageRatio = image.width / image.height;
    const maxContentWidth = maxWidth - padding;
    const maxContentHeight = maxHeight - padding;
    const containerRatio = maxContentWidth / maxContentHeight;

    let contentWidth, contentHeight;

    if (imageRatio > containerRatio) {
      contentWidth = maxContentWidth;
      contentHeight = contentWidth / imageRatio;
    } else {
      contentHeight = maxContentHeight;
      contentWidth = contentHeight * imageRatio;
    }

    contentWidth *= scaleFactor;
    contentHeight *= scaleFactor;

    const availableWidth = contentWidth - gapTotal;
    const availableHeight = contentHeight - gapTotal;
    const pieceSize = Math.floor(Math.min(availableWidth, availableHeight) / gridSize);

    const finalContentWidth = pieceSize * gridSize + gapTotal;
    const finalContentHeight = pieceSize * gridSize + gapTotal;
    
    const puzzleWidth = finalContentWidth + padding;
    const puzzleHeight = finalContentHeight + padding;

    return { pieceSize, puzzleWidth, puzzleHeight };
  }

  createPieceElement(piece, index) {
    const element = document.createElement('div');
    element.className = 'puzzle-piece';
    element.draggable = true;
    element.dataset.index = index;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `Puzzle piece ${index + 1}`);

    const bgX = -piece.correctCol * this.state.pieceSize;
    const bgY = -piece.correctRow * this.state.pieceSize;

    Object.assign(element.style, {
      backgroundImage: `url(${this.state.originalImage.src})`,
      backgroundSize: `${this.state.puzzleWidth}px ${this.state.puzzleHeight}px`,
      backgroundPosition: `${bgX}px ${bgY}px`,
      width: `${this.state.pieceSize}px`,
      height: `${this.state.pieceSize}px`
    });

    return element;
  }

  renderPuzzle(onPieceCreated) {
    const fragment = document.createDocumentFragment();

    this.state.pieces.forEach((piece, index) => {
      const element = this.createPieceElement(piece, index);
      if (onPieceCreated) {
        onPieceCreated(element);
      }
      fragment.appendChild(element);
    });

    this.dom.get('puzzleGrid').appendChild(fragment);
  }

  animateSwap() {
    const pieces = Array.from(this.dom.getAllPuzzlePieces());
    pieces.forEach(piece => {
      piece.style.animation = `swapPulse ${CONFIG.animation.swapDuration}ms ease`;
    });

    setTimeout(() => {
      pieces.forEach(piece => {
        piece.style.animation = '';
      });
    }, CONFIG.animation.swapDuration);
  }

  showWinAnimation() {
    this.dom.get('completedImage').src = this.state.originalImage.src;
    this.dom.getAllPuzzlePieces().forEach(piece => {
      piece.classList.add('correct');
    });

    setTimeout(() => {
      this.dom.showWinModal();
      ConfettiEffect.create();
    }, CONFIG.animation.swapDuration);
  }
}

// ============================================================================
// DRAG AND DROP HANDLER
// ============================================================================

class DragDropHandler {
  constructor(domManager, onSwap) {
    this.dom = domManager;
    this.onSwap = onSwap;
    this.draggedElement = null;
    this.draggedIndex = null;
  }

  attachListeners(element) {
    element.addEventListener('dragstart', this.handleDragStart.bind(this));
    element.addEventListener('dragover', this.handleDragOver.bind(this));
    element.addEventListener('drop', this.handleDrop.bind(this));
    element.addEventListener('dragend', this.handleDragEnd.bind(this));
    element.addEventListener('dragenter', this.handleDragEnter.bind(this));
    element.addEventListener('dragleave', this.handleDragLeave.bind(this));
  }

  handleDragStart(event) {
    this.draggedElement = event.target;
    this.draggedIndex = parseInt(event.target.dataset.index, 10);
    
    setTimeout(() => {
      if (this.draggedElement) {
        event.target.classList.add('dragging');
      }
    }, 0);
    
    event.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    this.dom.clearHighlights();
    
    if (event.target.classList.contains('puzzle-piece') && 
        event.target !== this.draggedElement) {
      event.target.classList.add('highlight');
    }
  }

  handleDragEnter(event) {
    event.preventDefault();
    
    if (event.target.classList.contains('puzzle-piece') && 
        event.target !== this.draggedElement) {
      event.target.classList.add('highlight');
    }
  }

  handleDragLeave(event) {
    if (event.target.classList.contains('puzzle-piece')) {
      event.target.classList.remove('highlight');
    }
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target.closest('.puzzle-piece');

    if (target && target !== this.draggedElement && this.draggedElement) {
      const targetIndex = parseInt(target.dataset.index, 10);

      if (!isNaN(this.draggedIndex) && !isNaN(targetIndex)) {
        this.onSwap(this.draggedIndex, targetIndex);
      }
    }

    this.dom.clearHighlights();
  }

  handleDragEnd(event) {
    event.target.classList.remove('dragging');
    this.dom.clearHighlights();
    this.draggedElement = null;
    this.draggedIndex = null;
  }
}

// ============================================================================
// TOUCH HANDLER
// ============================================================================

class TouchHandler {
  constructor(domManager, onSwap) {
    this.dom = domManager;
    this.onSwap = onSwap;
    this.touchPiece = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const grid = this.dom.get('puzzleGrid');

    grid.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    grid.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    grid.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }

  handleTouchStart(event) {
    const target = event.target.closest('.puzzle-piece');
    if (!target) return;

    this.touchPiece = target;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    target.classList.add('dragging');
  }

  handleTouchMove(event) {
    if (!this.touchPiece) return;

    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - this.touchStartX);
    const dy = Math.abs(touch.clientY - this.touchStartY);

    if (dx <= 10 && dy <= 10) return;

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = element?.closest('.puzzle-piece');

    this.dom.clearHighlights();

    if (target && target !== this.touchPiece) {
      target.classList.add('highlight');
    }
  }

  handleTouchEnd(event) {
    if (!this.touchPiece) return;

    const touch = event.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = element?.closest('.puzzle-piece');

    if (target && target !== this.touchPiece) {
      const index1 = parseInt(this.touchPiece.dataset.index, 10);
      const index2 = parseInt(target.dataset.index, 10);

      if (!Number.isNaN(index1) && !Number.isNaN(index2)) {
        this.onSwap(index1, index2);
      }
    }

    this.touchPiece.classList.remove('dragging');
    this.dom.clearHighlights();
    this.touchPiece = null;
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

class ImageLoader {
  static async load(path) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${path}`));
      
      image.src = path;
    });
  }
}

class FileDownloader {
  static async download(url, filename) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}

class ConfettiEffect {
  static create() {
    const { colors, sizeRange, driftRange, durationRange, delayRange } = CONFIG.confetti;
    const count = CONFIG.animation.confettiCount;

    for (let i = 0; i < count; i++) {
      const confetti = this.createConfettiPiece(
        colors,
        sizeRange,
        driftRange,
        durationRange,
        delayRange
      );
      
      document.body.appendChild(confetti);
      
      const totalDuration = (parseFloat(confetti.style.animationDuration) + 
                            parseFloat(confetti.style.animationDelay)) * 1000 + 200;
      
      setTimeout(() => confetti.remove(), totalDuration);
    }
  }

  static createConfettiPiece(colors, sizeRange, driftRange, durationRange, delayRange) {
    const element = document.createElement('div');
    element.className = 'confetti';
    
    const size = this.random(sizeRange[0], sizeRange[1]);
    const drift = this.random(driftRange[0], driftRange[1]);
    const duration = this.randomFloat(durationRange[0], durationRange[1]);
    const delay = this.randomFloat(delayRange[0], delayRange[1]);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = this.randomFloat(0.6, 1);
    const shape = Math.random() > 0.6 ? '50%' : '2px';

    Object.assign(element.style, {
      left: `${Math.random() * 100}%`,
      background: color,
      opacity: opacity.toFixed(2),
      borderRadius: shape,
      '--size': `${size}px`,
      '--drift': `${drift}px`,
      animation: `confetti ${duration.toFixed(2)}s linear ${delay.toFixed(2)}s 1`
    });

    return element;
  }

  static random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================

class PuzzleGame {
  constructor() {
    this.state = new GameState();
    this.dom = new DOMManager();
    this.renderer = null;
    this.dragDropHandler = null;
    this.touchHandler = null;
  }

  async initialize() {
    try {
      this.dom.cacheElements();
      this.bindEvents();
      await this.loadPuzzle();
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  bindEvents() {
    this.dom.get('downloadBtn')?.addEventListener('click', () => this.downloadImagePack());
    this.dom.get('playAgainBtn')?.addEventListener('click', () => window.location.reload());
  }

  async loadPuzzle() {
    const { puzzle, paths } = CONFIG;
    const imagePath = `${paths.base}/${puzzle.folder}/${puzzle.image}`;
    const downloadPath = `${paths.base}/${puzzle.folder}/${puzzle.downloads}`;

    try {
      const image = await ImageLoader.load(imagePath);
      
      this.state.setPuzzleData(image, puzzle.name, downloadPath);
      this.dom.setBackgroundImage(imagePath);
      
      this.createPuzzle();
    } catch (error) {
      this.handleError(`Failed to load "${puzzle.name}"`, error, imagePath);
    }
  }

  createPuzzle() {
    this.dom.clearPuzzleGrid();
    
    this.renderer = new PuzzleRenderer(this.dom, this.state);
    
    const layout = this.renderer.calculateLayout(
      this.state.originalImage,
      this.state.gridSize
    );
    
    this.state.setDimensions(layout.puzzleWidth, layout.puzzleHeight, layout.pieceSize);
    this.state.initializePieces();
    
    this.dom.setPuzzleGridStyle(
      layout.puzzleWidth,
      layout.puzzleHeight,
      this.state.gridSize,
      layout.pieceSize
    );
    
    this.initializeHandlers();
    this.renderer.renderPuzzle((element) => {
      this.dragDropHandler.attachListeners(element);
    });
  }

  initializeHandlers() {
    this.dragDropHandler = new DragDropHandler(
      this.dom,
      (index1, index2) => this.handlePieceSwap(index1, index2)
    );
    
    this.touchHandler = new TouchHandler(
      this.dom,
      (index1, index2) => this.handlePieceSwap(index1, index2)
    );
    
    this.touchHandler.initialize();
  }

  handlePieceSwap(index1, index2) {
    const swapped = this.state.swapPieces(index1, index2);
    
    if (!swapped) return;
    
    this.rebuildPuzzle();
    
    if (this.state.isPuzzleSolved()) {
      setTimeout(() => this.handleWin(), CONFIG.animation.winDelay);
    }
  }

  rebuildPuzzle() {
    this.dom.clearPuzzleGrid();
    this.renderer.renderPuzzle((element) => {
      this.dragDropHandler.attachListeners(element);
    });
    this.renderer.animateSwap();
  }

  handleWin() {
    this.renderer.showWinAnimation();
  }

  async downloadImagePack() {
    const { currentDownloadPath, currentBoardName } = this.state;

    if (!currentDownloadPath) {
      alert('No zip configured for this board.\n\nSet "downloads" to a .zip file name in CONFIG.');
      return;
    }

    try {
      await FileDownloader.download(currentDownloadPath, CONFIG.puzzle.downloads);
    } catch (error) {
      this.handleError(
        `Failed to download zip for "${currentBoardName}"`,
        error,
        currentDownloadPath
      );
    }
  }

  handleError(message, error, path = '') {
    console.error(message, error);
    const pathInfo = path ? `\n\nPath: ${path}` : '';
    alert(`${message}${pathInfo}\n\nError: ${error.message}`);
  }
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const game = new PuzzleGame();
  game.initialize();
});