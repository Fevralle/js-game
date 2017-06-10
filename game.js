'use strict';
class Vector {
  constructor(x, y) {
    // лучше это задать через параметры по-умолчанию constructor(x = 0, y = 0) {
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
    // const
    var newX = this.x * factor;
    var newY = this.y * factor;
    return new Vector(newX, newY);
  }
}

class Actor {
  constructor(posVect = new Vector(0, 0), sizeVect = new Vector(1, 1), speedVect = new Vector(0, 0)) {
    if (!(posVect instanceof Vector && sizeVect instanceof Vector && speedVect instanceof Vector)) {
      // лучше разбить на 3 if, а то сейчас по сообщению непонятно где ошибка
      throw new Error('parameter is not an instance of Vector!');
    }
    this.pos = posVect;
    this.size = sizeVect;
    this.speed = speedVect;
  }

  // в одну строчку лучше не писать - сложнее читается
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
      // лучше задать через параметры по-умолчанию
      // и нужно сделать копии массивов через slice или другим способом
    this.grid = grid || [];
    this.actors = actors || [];
    this.status = null;
    this.finishDelay = 1;
  }

  get player() {
    return this.actors.find(actor => actor.type === 'player');
  }

  get height() {
      // лучше просто заполнить поле height в конструкторе
    return this.grid.length;
  }

  get width() {
      // тоже лучше в конструкторе
    if (this.grid.length === 0) {
      return 0;
    }
    // через reduce было бы чуть более изящно, тогда и проверка выше была бы ненужна
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
      // тут можно убрать else, т.к. if заканчивается на return
    } else if (bottom > this.height) {
      return 'lava';
      // тут тоже
    } else {
      let area = [];
      // круто, но сложно разобраться, попробуйте развернуть, чтобы было понятнее
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
      // по-моему некорректное условие - если элемент будет первым (индекс = 0)
      // то вернётся false. Тут лучше использовать some или every
    return this.actors.findIndex(v => v.type === type)? true : false;
  }

  // идеаально
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
      // лучше через значения по умолчанию
    this.glossary = glossary || {};
    this.actorsArr = [];
  }

  actorFromSymbol(symbol) {
      // этот метод можно упростить -
      // просто вернуть значение по ключу из glossary без проверок - будет точно так же работать
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
      // сложновато, лучше сделать 2 forEach
        // здесь модифицируется массив - лучше использовать переменную объявленную в этой функции,
        // иначе если вызвать мтеод 2 раза массив будет в 2 раза больше
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
    // эти поля должны заполняться в конструкторе базового класса
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
      // точка с запятой
    let newPos = this.getNextPosition(time)
        // тут лучше обратить условие, чтобы убрать отрицание в if
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
      // эти поля должны заполняться в конструкторе базового класса
    this.pos = posVect;
    this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball {
  constructor(posVect) {
    super();
      // эти поля должны заполняться в конструкторе базового класса
    this.pos = posVect;
    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball {
  constructor(posVect) {
    super();
      // эти поля должны заполняться в конструкторе базового класса
    this.pos = posVect;
    this.speed = new Vector(0, 3);
    // это - нет, это - ок :)
    this.startPos = posVect;
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}
