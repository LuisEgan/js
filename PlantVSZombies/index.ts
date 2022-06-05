import { Rectangle } from "./index.types";

const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 600;

type TGroup<T> = { [id: number]: T };

// * Global variables
export const cellSize = 100;
const cellGap = 3;
const gameGrid = [];
let score = 0;
let numberOfResources = 300;
let gameOver = false;
let frame = 0;

const defenders: TGroup<Defender> = [];
let defendersCount = 0;
const enemies: TGroup<Enemy> = {};
let enemiesCount = 0;
const enemiesPos = [];
let enemiesInterval = 600;

const projectiles: TGroup<Projectile> = [];
let projectilesCount = 0;

// * Mouse
const mouse: Rectangle = {
  x: 10,
  y: 10,
  width: 0.1,
  height: 0.1,
};
let canvasPosition = canvas.getBoundingClientRect();
canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.x - canvasPosition.left;
  mouse.y = e.y - canvasPosition.top;
});
canvas.addEventListener("mouseleave", () => {
  mouse.x = undefined;
  mouse.y = undefined;
});

// * Game board
const constrolsBar = {
  width: canvas.width,
  height: cellSize,
};

class Cell extends Rectangle {
  constructor(x: number, y: number) {
    super();

    this.x = x;
    this.y = y;
  }

  draw() {
    if (mouse.x && mouse.y && collision(this, mouse)) {
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }
}

const createGrid = () => {
  for (let i = cellSize; i <= canvas.height; i += cellSize) {
    for (let j = 0; j < canvas.width; j += cellSize) {
      gameGrid.push(new Cell(j, i));
    }
  }
};

const handleGameGrid = () => {
  for (let i = 0; i < gameGrid.length; i++) {
    gameGrid[i].draw();
  }
};

// * Projectiles
class Projectile extends Rectangle {
  power = 200;
  speed = 5;

  constructor(x: number, y: number) {
    super();

    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 10;
    this.groupIndex = projectilesCount;
  }

  update() {
    this.x += this.speed;
  }

  remove() {
    delete projectiles[this.groupIndex];
  }

  draw() {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
    ctx.fill();
  }
}
const handleProjectiles = () => {
  Object.values(projectiles).forEach((p, pIndex) => {
    p.update();
    p.draw();

    // * Check for enemies collision
    let hitEnemy = false;
    Object.values(enemies).forEach((e) => {
      if (collision(p, e)) {
        e.health -= p.power;
        p.remove();
        hitEnemy = true;
      }
    });
    if (hitEnemy) return;

    // * If the projectile left the canvas, remove it
    if (p.x > canvas.width - cellSize) {
      p.remove();
    }
  });
};

// * Defenders
class Defender extends Rectangle {
  shooting = false;
  health = 100;
  timer = 0;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.groupIndex = defendersCount;
  }

  update() {
    // * Reset shooting timer and don't shoot if not set
    if (!this.shooting) {
      this.timer = 0;
      return;
    }

    this.timer++;
    if (this.timer % 100 === 0) {
      projectiles[projectilesCount] = new Projectile(
        this.x + cellSize / 2,
        this.y + cellSize / 2
      );
      projectilesCount++;
    }
  }

  remove() {
    delete defenders[this.groupIndex];
  }

  draw() {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "gold";
    ctx.font = "30px Orbitron";
    ctx.fillText(`${Math.floor(this.health)}`, this.x + 15, this.y + 30);
  }
}
canvas.addEventListener("click", (e) => {
  // * value of the closes horizontal grid pos to the left
  const gridPosX = mouse.x - (mouse.x % cellSize);

  // * value of the closes horizontal grid pos to the top
  const gridPosY = mouse.y - (mouse.y % cellSize);

  // * Do nothing if clicked on the top bar
  if (gridPosY < cellSize) return;

  if (
    Object.values(defenders).some((d) => d.x === gridPosX && d.y === gridPosY)
  )
    return;

  let defenderCost = 100;
  if (numberOfResources >= defenderCost) {
    defenders[defendersCount] = new Defender(gridPosX, gridPosY);
    defendersCount++;
    numberOfResources -= defenderCost;
  }
});
const handleDefenders = () => {
  Object.values(defenders).forEach((d, dIndex) => {
    d.draw();
    d.update();

    Object.values(enemies).forEach((e) => {
      if (collision(d, e)) {
        d.health -= 0.2;
        e.movement = 0;
      }

      // * If defender dies
      if (d.health <= 0) {
        // * Resume enemy movement
        e.movement = e.speed;

        // * Remove defender
        d.remove();
      }
    });
  });
};

// * Enemies
class Enemy extends Rectangle<Enemy> {
  speed = Math.random() * 0.2 + 0.4;
  movement = this.speed;
  health = 200;
  maxHealth = this.health;

  constructor(verticalPos: number) {
    super();
    this.x = canvas.width;
    this.y = verticalPos;
    this.groupIndex = enemiesCount;
  }

  update() {
    // * Move the enemy
    this.x -= this.movement;

    // * If an enemy's health is equal or less than 0, remove it
    // * and add resources
    if (this.health <= 0) {
      this.remove();
      const gain = this.maxHealth / 10;
      numberOfResources += gain;
      score += gain;
    }
  }

  remove() {
    delete enemies[this.groupIndex];
  }

  draw() {
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "black";
    ctx.font = "30px Orbitron";
    ctx.fillText(`${Math.floor(this.health)}`, this.x + 15, this.y + 30);
  }
}
const handleEnemies = () => {
  Object.values(enemies).forEach((e) => {
    e.update();
    e.draw();

    // * If an enemy reached the left part of canvas, game is over
    if (e.x <= 0) {
      gameOver = true;
    }
  });

  // * Spawn enemies each enemiesInterval frames
  if (frame % enemiesInterval === 0) {
    const verticalPos = Math.floor(Math.random() * 5 + 1) * cellSize;
    enemies[enemiesCount] = new Enemy(verticalPos);
    enemiesCount++;
    enemiesPos.push(verticalPos);

    if (enemiesInterval > 120) {
      enemiesInterval -= 100;
    }
  }
};

// * Resources

// * Utilities
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = Math.random() > 0.5 ? "blue" : "green";
  ctx.fillRect(0, 0, constrolsBar.width, constrolsBar.height);

  if (!gameOver) {
    requestAnimationFrame(animate);
  }

  handleGameStatus();
  handleGameGrid();
  handleDefenders();
  handleEnemies();
  handleProjectiles();
  frame++;
}

function handleGameStatus() {
  ctx.fillStyle = "gold";
  ctx.font = "30px Orbitron";
  ctx.fillText(`Score: ${score}`, 10, 35);
  ctx.fillText(`Resources: ${numberOfResources}`, 10, 75);

  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "60px Orbitron";
    ctx.fillText("GAME OVER", 200, 350);
  }
}

function collision(rect1: Rectangle, rect2: Rectangle) {
  const rect1L = rect1.x;
  const rect1R = rect1.x + rect1.width;
  const rect1T = rect1.y;
  const rect1B = rect1.y + rect1.height;

  const rect2L = rect2.x;
  const rect2R = rect2.x + rect2.width;
  const rect2T = rect2.y;
  const rect2B = rect2.y + rect2.height;

  return !(
    rect1L > rect2R ||
    rect1R < rect2L ||
    rect1T > rect2B ||
    rect1B < rect2T
  );
}

// * Exec
createGrid();
animate();
