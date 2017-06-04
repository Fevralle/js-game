'use strict';
class Vector {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }

  plus(vectorObj) {
    // условие лучше обратить и убрать else
    if(vectorObj instanceof Vector) {
      // если значение не меняется лучше использовать const
      // newX - более удачное название переменной
      var xnew = this.x + vectorObj.x;
      var ynew = this.y + vectorObj.y;
      // тут должно быть new Vector
      return new this.constructor(xnew, ynew);
    } else {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector!');
    }
  }

  times(factor) {
    var xnew = this.x * factor;
    var ynew = this.y * factor;
    // new Vector
    return new this.constructor(xnew, ynew);
  }
}

class Actor {
  constructor(posVect = new Vector(0, 0), sizeVect = new Vector(1, 1), speedVect = new Vector(0, 0)) {
    // лучше обратить условие и убрать else
    // проверять тип нужно через instanceof
    if (Vector.prototype.isPrototypeOf(posVect) && Vector.prototype.isPrototypeOf(sizeVect) && Vector.prototype.isPrototypeOf(speedVect)) {
      this.pos = posVect;
      this.size = sizeVect;
      this.speed = speedVect;
      // должно быть ниже get type() { }
      Object.defineProperty(this, 'type', {
      writable: false,
      value: 'actor'
      });
    } else {
      throw new Error('parameter is not an instance of Vector!');
    }
  }

  get left() {return this.pos.x}

  get top() {return this.pos.y}

  get right() {return this.pos.x + this.size.x}

  get bottom() {return this.pos.y + this.size.y}

  act(){}

  isIntersect(actorObj) {
    // instanceof
    if (!Actor.prototype.isPrototypeOf(actorObj)) {
        throw new Error('wrong object type!');
    }

    // лишняя проверка
    if (actorObj === 0) {
        throw new Error('no parameter provided!');
    }

    if (actorObj === this) {
      return false;
    }

    // скобочки можно убрать
    if ((this.left >= actorObj.right) || (this.top >= actorObj.bottom) ||
       (actorObj.left >= this.right) || (actorObj.top >= this.bottom)) {
         return false;
         // else тут не нужен
    } else {
      return true;
    }
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
      // else лишний
    } else {
      return this.grid.map(row => row.length).sort((a,b) => b-a)[0];
    }
  }

  isFinished() {
    // это же тоже самое, что return this.status !== null && this.finishDelay < 0;
    if ((this.status !== null) && (this.finishDelay < 0)) {
      return true;
    } else {
      return false;
    }
  }

  actorAt(actorObj) {
    // тут нужно проверить, что объект является наследником Actor
    // сейчас я могу передать {speed: 1} и всё сломается
    if (!('speed' in actorObj)) {
      throw new Error('Not a moving object!');
    }
    // === true - не нужно, isIntersect уже возвращает true/false
    return this.actors.find(actor => actorObj.isIntersect(actor)===true);
  }

  obstacleAt(newPos, actorSize) {
    // instanceof
    if (!Vector.prototype.isPrototypeOf(newPos) && !Vector.prototype.isPrototypeOf(actorSize)){
      throw new Error('Not an instance of Vector!');
    }

    let left = Math.floor(newPos.x);
    let right = Math.ceil(left + actorSize.x);
    let top = Math.floor(newPos.y);
    let bottom = Math.ceil(top + actorSize.y);

    if ((left < 0) || (top < 0) || (right > this.width)) {
      return 'wall';
    } else if (bottom > this.height) {
      return 'lava';
    } else {
      let area = [];
      for(let i = top + 1; i < bottom + 1; i++) {
        area.push(...this.grid[i].slice(left, right+1));
      }
      // здесь можно area.find(v  => v);
      return area.find(v  => v !== undefined);
    }
  }

  removeActor(actorObj) {
    let delIndex = this.actors.indexOf(actorObj);
    if(delIndex === -1) {
      return;
       // else лишний
    } else {
      this.actors.splice(delIndex, 1);
    }
  }

  noMoreActors(type) {
    let result = this.actors.findIndex(v => v.type === type);
    // упростить
    if (result === -1) {
      return true;
    } else {
      return false;
    }
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }

    if ((type === 'lava') || (type === 'fireball')) {
      this.status = 'lost';
      return;
    }
    if ((type === 'coin') && (actor.type === 'coin')){
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(glossary) {
    this.glossary = glossary || [];
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
          // тут можно просто if (ConstrActor)
          if (ConstrActor !== undefined) {
            // помните о форматировании
            // тут нужно проверить, что созданный объект является наследником Actor
          return new ConstrActor(new Vector(i, this.y));
          } else {
            return undefined;
          }
          // здесь можно просто filter(v => v)
      }).filter(v => v !== undefined));
    });
    return this.actorsArr;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}
