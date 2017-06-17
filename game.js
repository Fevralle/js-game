'use strict';
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vectorObj) {
    if (!(vectorObj instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector!');
    }
    const newX = this.x + vectorObj.x;
    const newY = this.y + vectorObj.y;
    return new Vector(newX, newY);
  }

  times(factor) {
    const newX = this.x * factor;
    const newY = this.y * factor;
    return new Vector(newX, newY);
  }
}

class Actor {
  constructor(posVect = new Vector(0, 0), sizeVect = new Vector(1, 1), speedVect = new Vector(0, 0)) {
    if (!(posVect instanceof Vector)) {
      throw new Error('the 1st parameter is not an instance of Vector!');
    }
    if (!(sizeVect instanceof Vector)) {
      throw new Error('the 2nd parameter is not an instance of Vector!');
    }
    if (!(speedVect instanceof Vector)) {
      throw new Error('the 3d parameter is not an instance of Vector!');
    }
    this.pos = posVect;
    this.size = sizeVect;
    this.speed = speedVect;
  }

  get type() {
    return 'actor';
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

  act(){}

  isIntersect(actorObj) {
    if (!(actorObj instanceof Actor)) {
      throw new Error('not an instance ofActor was passed!');
    }

    if (actorObj === this) {
      return false;
    }

    if (this.left >= actorObj.right || this.top >= actorObj.bottom ||
        actorObj.left >= this.right || actorObj.top >= this.bottom) {
      return false;
    }
    return true;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.height = this.grid.length;
    this.width = this.grid.slice().reduce((a, v) => {
      if (v.length > a) {
        a = v.length;
      }
      return a;
    }, 0);
    this.status = null;
    this.finishDelay = 1;
  }

  get player() {
    return this.actors.slice().find(actor => actor.type === 'player');
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actorObj) {
    if (!(actorObj instanceof Actor)) {
      throw new Error('Not a moving object!');
    }
    return this.actors.find(actor => actorObj.isIntersect(actor));
  }

  obstacleAt(newPos, actorSize) {
    if (!(newPos instanceof Vector && actorSize instanceof Vector)) {
      throw new Error('Not an instance of Vector!');
    }

    let left = Math.floor(newPos.x);
    let right = Math.ceil(left + actorSize.x);
    let top = Math.floor(newPos.y);
    let bottom = Math.ceil(top + actorSize.y);

    if (left < 0 || top < 0 || right > this.width-1) {
      return 'wall';
    }
    if (bottom > this.height-1) {
      return 'lava';
    }

    const grid = this.grid.slice();
    const verticalCut =  grid.slice(top, bottom + 1);
    let horizontalCut = verticalCut.map(v => v.slice(left, right + 1));
    const sectionContent = [];
    horizontalCut.forEach(v => sectionContent.push(...v));
    return sectionContent.find(v  => v);
  }

  removeActor(actorObj) {
    let delIndex = this.actors.indexOf(actorObj);
    if (delIndex === -1) {
      return;
    }
    this.actors.splice(delIndex, 1);
  }

  noMoreActors(type) {
    return !this.actors.some(v => v.type === type);
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }

    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
      return;
    }

    if (type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(glossary = {}) {
    this.glossary = glossary;
    this.actorsArr = [];
  }

  actorFromSymbol(symbol) {
    return this.glossary[symbol];
  }

  obstacleFromSymbol(symbol) {
    switch (symbol) {
      case 'x':
        return 'wall';
      case '!':
        return 'lava';
      default:
        return undefined;
    }
  }

  createGrid(plan) {
    return plan.map(v => v.split('').map(v => this.obstacleFromSymbol(v)));
  }

  createActors(plan) {
    let actorsContainer = plan.map(v => v.split(''));
    actorsContainer.forEach((v, i) => {
      this.y = i;
      v.forEach((v, i) => {
        var ConstrActor = this.actorFromSymbol(v);
        if (ConstrActor instanceof Function) {
          let newactor = new ConstrActor(new Vector(i, this.y));
          if (newactor instanceof Actor) {
            this.actorsArr.push(newactor);
          }
        }
      });
    });
    return this.actorsArr;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(posVect = new Vector(0, 0), speedVect = new Vector(0, 0)) {
    super(posVect, new Vector(1, 1), speedVect);
  }

  get type() {return 'fireball'}

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, levelObj) {
    let newPos = this.getNextPosition(time);
    if (levelObj.obstacleAt(newPos, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = newPos;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(posVect) {
    super(posVect, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(posVect) {
    super(posVect, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(posVect) {
    super(posVect, new Vector(0, 3));
    this.startPos = posVect;
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

class Coin extends Actor {
  constructor(posVect) {
    super(posVect, new Vector(0.6, 0.6));
    this.pos = this.pos.plus(new Vector(0.2, 0.1));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = getRandomArbitrary(0, 2 * Math.PI);
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed*time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring)*this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.pos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(posVect) {
    super(posVect, new Vector(0.8, 1.5));
    this.pos = this.pos.plus(new Vector(0, -0.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'o': Coin,
  '|': VerticalFireball,
  'v': FireRain
};

/*
const schema = [
'     v                 ',
'                       ',
'                       ',
'                       ',
'                       ',
'  |                    ',
'  o                 o  ',
'  x               = x  ',
'  x          o o    x  ',
'  x  @       xxxxx  x  ',
'  xxxxx             x  ',
'      x!!!!!!!!!!!!!x  ',
'      xxxxxxxxxxxxxxx  ',
'                       '
]
*/
/* это уровень из инструкции, я добавила стены, чтобы ширина поля была, как в
игре - 23. снова получается, что не отображаются три последних элемента в строке.
при этом горизонтальная молния уходит влево "за пределы видимости", отталкивается
там от стены - границы поля и возвращается. не понимаю, почему так просиходит.
если сделать уровень шириной 20, то все будет ок*/ 
const schema = [
    '      v  ',
    '    =    ',
    '  |      ',
    '        o',
    '        x x x x x x x x',
    '@   x    ',
    'x        ',
    '         '
  ];


const parser = new LevelParser(actorDict);
const level = parser.parse(schema);
runLevel(level, DOMDisplay)
  .then(status => console.log(`Игрок ${status}`));
  console.log(level.grid);
  console.log(level.actors);
  console.log(level.width);
