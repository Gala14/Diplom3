'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('����� ���������� � ������� ������ ������ ���� Vector');
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(num) {
    return new Vector(this.x * num, this.y * num);
  }
}

class Actor {
  constructor(
    position = new Vector(0, 0),
    size = new Vector(1, 1),
    speed = new Vector(0, 0)) {
    if (
      !(position instanceof Vector) ||
      !(size instanceof Vector) ||
      !(speed instanceof Vector)) {
      throw new Error();
    }
    this.pos = position;
    this.size = size;
    this.speed = speed;
  }

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  act() {

  }

  isIntersect(actor) {
    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error();
    }
    if (
      actor === this ||
      actor.bottom <= this.top ||
      actor.left >= this.right ||
      actor.top >= this.bottom ||
      actor.right <= this.left
    ) {
      return false;
    }
    return true;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.player = this.actors.find(function (x) {
      return x.type === 'player';
    });
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(x => x.length));
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    if (this.status !== null && this.finishDelay < 0) {
      return true;
    }
    return false;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor) || actor === undefined) {
      throw new Error();
    }
    return this.actors.find(function (x) {
      return x.isIntersect(actor)
    });
  }

  obstacleAt(position, size) {
    if (!(position instanceof Vector) || !(size instanceof Vector)) {
      return new Error();
    }

    let actor = new Actor(position, size);
    if (actor.bottom > this.height) {
      return 'lava';
    }
    if (actor.left < 0 || actor.top < 0 || actor.right > this.width) {
      return 'wall';
    }
    for (let x = Math.floor(actor.left); x < actor.right; x++) {
      for (let y = Math.floor(actor.top); y < actor.bottom; y++) {
        if (this.grid[y][x] !== undefined) {
          return this.grid[y][x];
        }
      }
    }
    return undefined;
  }

  removeActor(actor) {
    let index = this.actors.findIndex(x => x === actor);
    if (index !== -1) {
      this.actors.splice(index, 1);
    }
  }

  noMoreActors(type) {
    return this.actors.every(x => x.type !== type);
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
      return;
    }
    if (type === 'coin' && actor !== undefined && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(diction) {
    if (diction === undefined) {
      this.diction = [];
    } else {
      this.diction = diction;
    }
  }

  actorFromSymbol(char) {
    if (char !== undefined) {
      return this.diction[char];
    }
    return undefined;
  }

  obstacleFromSymbol(char) {
    switch (char) {
      case 'x':
        return 'wall';
      case '!':
        return 'lava';
      default:
        return undefined;
    }
  }

  createGrid(strings) {
    let grid = [];
    for (let i = 0; i < strings.length; i++) {
      let cells = [];
      for (let y = 0; y < strings[i].length; y++) {
        cells.push(this.obstacleFromSymbol(strings[i].charAt(y)));
      }
      grid.push(cells);
    }
    return grid;
  }

  createActors(strs) {
    let actors = [];
    for (let i = 0; i < strs.length; i++) {
      for (let j = 0; j < strs[i].length; j++) {
        let actor = this.actorFromSymbol(strs[i].charAt(j));
        if (actor !== undefined && typeof actor === 'function') {
          let inst = new actor(new Vector(j, i));
          if (inst instanceof Actor) {
            actors.push(inst);
          }
        }
      }
    }
    return actors;
  }

  parse(strings) {
    return new Level(this.createGrid(strings), this.createActors(strings));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    let newPosition = this.getNextPosition(time);
    if (level.obstacleAt(newPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = newPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.beginPos = pos;
  }

  handleObstacle() {
    this.pos = this.beginPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.posStart = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (2 * Math.PI);
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.posStart.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
    this.posStart = this.pos;
  }

  get type() {
    return 'player';
  }
}