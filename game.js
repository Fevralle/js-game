'use strict';
class Vector {
  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
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
    var newX = this.x * factor;
    var newY = this.y * factor;
    return new Vector(newX, newY);
  }
}

class Actor {
  constructor(posVect = new Vector(0, 0), sizeVect = new Vector(1, 1), speedVect = new Vector(0, 0)) {
    if (!(posVect instanceof Vector && sizeVect instanceof Vector && speedVect instanceof Vector)) {
      throw new Error('parameter is not an instance of Vector!');
    }
    this.pos = posVect;
    this.size = sizeVect;
    this.speed = speedVect;
  }

  get type() {return 'actor'}

  get left() {return this.pos.x}

  get top() {return this.pos.y}

  get right() {return this.pos.x + this.size.x}

  get bottom() {return this.pos.y + this.size.y}

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
  constructor(grid, actors) {
    this.grid = grid || [];
    this.actors = actors || [];
    this.status = null;
    this.finishDelay = 1;
  }

  get player() {
    return this.actors.find(actor => actor.type === 'player');
  }

  get height() {
    return this.grid.length;
  }

  get width() {
    if (this.grid.length === 0) {
      return 0;
    }
    return this.grid.map(row => row.length).sort((a,b) => b-a)[0];
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

    if (left < 0 || top < 0 || right > this.width) {
      return 'wall';
    } else if (bottom > this.height) {
      return 'lava';
    } else {
      let area = [];
      for (let i = top + 1; i < bottom + 1; i++) {
        area.push(...this.grid[i].slice(left, right+1));
      }
      return area.find(v  => v);
    }
  }

  removeActor(actorObj) {
    let delIndex = this.actors.indexOf(actorObj);
    if (delIndex === -1) {
      return;
    }
    this.actors.splice(delIndex, 1);
  }

  noMoreActors(type) {
    return this.actors.findIndex(v => v.type === type)? true : false;
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
  constructor(glossary) {
    this.glossary = glossary || {};
    this.actorsArr = [];
  }

  actorFromSymbol(symbol) {
    if (symbol === undefined) {
      return undefined;
    }
    if (symbol in this.glossary) {
      return this.glossary[symbol];
    }
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
    plan.forEach((v, i) => {
      this.y = i;
      this.actorsArr.push(...v.split('').map((v, i) => {
        var ConstrActor = this.actorFromSymbol(v);
        if (ConstrActor instanceof Function) {
          let newactor = new ConstrActor(new Vector(i, this.y));
          if (newactor instanceof Actor) {
            return newactor;
          }
        }
      }).filter(v => v));
    });
    return this.actorsArr;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(posVect = new Vector(0, 0), speedVect = new Vector(0, 0)) {
    super();
    this.pos = posVect;
    this.speed = speedVect;
  }

  get type() {return 'fireball'}

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, levelObj) {
    let newPos = this.getNextPosition(time)
    if (!levelObj.obstacleAt(newPos, this.size)) {
      this.pos = newPos;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(posVect) {
    super();
    this.pos = posVect;
    this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball {
  constructor(posVect) {
    super();
    this.pos = posVect;
    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball {
  constructor(posVect) {
    super();
    this.pos = posVect;
    this.speed = new Vector(0, 3);
    this.startPos = posVect;
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}
