'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Объект не является объектом типа Vector');
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(num) {
    return new Vector(this.x * num, this.y * num);
  }
}

class Actor {
  // аргуменрты функции лучше писать в одну строчку, иначе сливаются с кодом
  constructor(
    position = new Vector(0, 0),
    size = new Vector(1, 1),
    speed = new Vector(0, 0)) {
    if (
      !(position instanceof Vector) ||
      !(size instanceof Vector) ||
      !(speed instanceof Vector)) {
      // если выбрасываете исключение, всегда пишите сообщение об ошибке
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

    // это выражение лучше разбить на 2, первое сравнивает actor с this
    // второе - всё остальное
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
    // здесь лучше создать копии массивов, чтобы поля объекта нельзя было изменить извне
    this.grid = grid;
    this.actors = actors;
    // тут можно написать this.player = actors.find(... (без this, чтобы было короче)
    // также тут лучше использовать стрелочную функцию
    this.player = this.actors.find(function (x) {
      return x.type === 'player';
    });
    // тут тоже grid без this было бы короче
    this.height = this.grid.length;
    // вот это очень хорошо
    this.width = Math.max(0, ...this.grid.map(x => x.length));
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    // если у вас if (expr) { return true; } else { return false; } и expr это true или false
    // то лучше писать просто return expr;
    if (this.status !== null && this.finishDelay < 0) {
      return true;
    }
    return false;
  }

  actorAt(actor) {
    // вторая проверка лишняя - undefined instanceof Actor === false
    if (!(actor instanceof Actor) || actor === undefined) {
      // сообщение об ошибке
      throw new Error();
    }
    // стрелочная функция
    return this.actors.find(function (x) {
      return x.isIntersect(actor)
    });
  }

  obstacleAt(position, size) {
    if (!(position instanceof Vector) || !(size instanceof Vector)) {
      // сообщение об ошибке
      return new Error();
    }

    let actor = new Actor(position, size);
    if (actor.bottom > this.height) {
      return 'lava';
    }
    if (actor.left < 0 || actor.top < 0 || actor.right > this.width) {
      return 'wall';
    }
    // тут что-то не так, округлений не хватает,
    // возьмете уровни из levels.json и проверьте правильно ли ведёт себя игра
    for (let x = Math.floor(actor.left); x < actor.right; x++) {
      for (let y = Math.floor(actor.top); y < actor.bottom; y++) {
        // this.grid[y][x] лучше записать в переменную
        // и в качестве проверки достаточно if (this.grid[y][x])
        if (this.grid[y][x] !== undefined) {
          return this.grid[y][x];
        }
      }
    }
    // лишняя строчка, функция возвращает undefined если не указано другое
    return undefined;
  }

  removeActor(actor) {
    // если значение присваивается переменной один раз, то лучше использовать const вместо let
    // тут вместо findIndex можно использовать другой метод массива,
    // который принимает объект вместо функции обратного вызова
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

    // actor !== undefined можно заменить на просто actor (короче)
    if (type === 'coin' && actor !== undefined && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  // diction лучше сокращать до dict или вообще не сокращать
  constructor(diction) {
    // это лучше задать через значение аргумента по-умолчанию
    if (diction === undefined) {
      // тут должно быть другое значение
      this.diction = [];
    } else {
      this.diction = diction;
    }
  }

  actorFromSymbol(char) {
    // проверка лишняя (если её убрать ничего не изменится)
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
      // default можно убрать
      default:
        return undefined;
    }
  }

  createGrid(strings) {
    let grid = [];
    for (let i = 0; i < strings.length; i++) {
      let cells = [];
      for (let y = 0; y < strings[i].length; y++) {
        // вместо charAt можно использовать доступ по индексу в массиве
        cells.push(this.obstacleFromSymbol(strings[i].charAt(y)));
      }
      grid.push(cells);
    }
    return grid;
  }

  createActors(strs) {
    // если значение присваивается переменной один раз, то лучше использовать const
    let actors = [];
    for (let i = 0; i < strs.length; i++) {
      for (let j = 0; j < strs[i].length; j++) {
        // const
        let actor = this.actorFromSymbol(strs[i].charAt(j));
        // первую половину проверки можно убрать
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
    // const
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
    // лишняя строчка
    this.posStart = this.pos;
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball

};

// возьмите схемы уровней из levels.json
const schemas = [
  [
    '         ',
    '         ',
    '    =    ',
    '       o ',
    '     !xxx',
    ' @       ',
    'xxx!     ',
    '         '
  ],
  [
    '      v  ',
    '    v    ',
    '  v      ',
    '        o',
    '        x',
    '@   x    ',
    'x        ',
    '         '
  ]
];

const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));



