////// C O N S T A N T S /////
const scale = 40;

const motionSpeed = 8, motionDist = .07;

const playerSpeed = 7;

const maxSpeed = 15;

const arrowKeys = trackKeys(['a', 'd', 'w', 's', 'e']);

const bagCd = 1;

const probability = 10;



function resetAll() {
    Player.prototype.baseSpeed = playerSpeed;
}

//// C L A S S E S //////

class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    plus(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }
    times(value) {
        return new Vec(this.x * value, this.y * value);
    }
    isEqual(other) {
        return this.x == other.x && this.y == other.y;
    }
}

class Level {
    constructor(height, width, startActors, solidActors, rows) {
        this.height = height;
        this.width = width;
        this.startActors = startActors;
        this.solidActors = solidActors;
        this.rows = rows;
    }
    static create(plan) {
        let rows = plan.trim().split('\n').map(l => [...l]);
        let height = rows.length;
        let width = rows[0].length;
        let startActors = [];

        let solidActors = Array(height).fill(undefined).map((_) => Array(width).fill(undefined));

        rows = rows.map((row, y) => {
            return row.map((ch, x) => {
                let type = levelChars[ch];

                if (typeof type == "string") return type;
                if (type == Brick) {
                    solidActors[y][x] = "brick";
                }
                startActors.push(
                    type.create(new Vec(x, y)));
                return "empty";
            });
        });
        return new Level(height, width, startActors, solidActors, rows);
    }
}


class State {
    constructor(level, actors, status) {
        this.level = level;
        this.actors = actors;
        this.status = status;
    }

    static start(level) {
        return new State(level, level.startActors, "playing");
    }

    get player() {
        return this.actors.find(a => a.type == "player");
    }
}


class Player {
    constructor(pos, speed, bag) {
        this.pos = pos;
        this.speed = speed;
        this.bag = bag;
    }

    get type() { return "player"; }

    static create(pos) {
        return new Player(pos.plus(new Vec(.2, .2)), new Vec(0, 0), Bag.create());
    }
}
Player.prototype.size = new Vec(.6, .6);


class Brick {
    constructor(pos) {
        this.pos = pos;
    }
    get type() { return 'brick'; }

    static create(pos) {
        return new Brick(pos);
    }
}
Brick.prototype.size = new Vec(1, 1);



powers =
    ['moreBombs',
        'explosionRange',
        'moreSpeed',
        'pushBombs'];

class AddOn {
    constructor(pos, basePos, motion, power) {
        this.pos = pos;
        this.basePos = basePos;
        this.motion = motion;
        this.power = power;
    }

    get type() { return "addOn"; }

    static create(pos) {
        let basePos = pos.plus(new Vec(0.2, 0.2));
        let power = powers[Math.floor(Math.random() * powers.length)];
        return new AddOn(
            basePos,
            basePos,
            Math.random() * Math.PI * 2,
            power
        );
    }
}
AddOn.prototype.size = new Vec(0.6, 0.6);


class Bag {
    constructor(items, delay) {
        this.items = items;
        this.delay = delay;
    }
    get type() { return "Bag"; }

    static create() {
        return new Bag({ bombs: 3, bombRange: new Vec(1, 1), maxBombs: 3, speed: 7 }, 0);
    }
}

class Bomb {
    constructor(pos, range, delay, isSolid, speed) {
        this.pos = pos;
        this.range = range;
        this.delay = delay;
        this.isSolid = isSolid;
        this.speed = speed;
    }

    get type() { return "bomb"; }

    static create(pos, range = new Vec(5, 5)) {
        return new Bomb(
            pos.plus(new Vec(.1, .1)),
            range,
            2.2,
            false,
            new Vec(0, 0)
        );
    }

}
Bomb.prototype.size = new Vec(.8, .8);

class Explosion {
    constructor(pos, delay) {
        this.pos = pos;
        this.delay = delay;
    }
    get type() { return "explosion"; }

    static create(pos) {
        return new Explosion(pos, .3);
    }
}

Explosion.prototype.size = new Vec(1, 1);





///////////LEVEL CHARACTERS////////////////////


levelChars = {
    ".": "empty",
    "=": "wall",
    "@": Player,
    "$": AddOn,
    "#": Brick,
    "%": AddOn,
    "0": Bomb,
    "F": Explosion
}






///// W O R K  W I T H   H T M L /////////////


function elt(name, attrs, ...children) {
    let dom = document.createElement(name);
    for (let attr of Object.keys(attrs)) {
        dom.setAttribute(attr, attrs[attr]);
    }
    for (let child of children) {
        dom.appendChild(child);
    }
    return dom;
}

class DOMDisplay {
    constructor(parent, level) {
        this.dom = elt('div', { class: "game" }, drawGrid(level));
        this.actorLayer = null;
        parent.appendChild(this.dom);
    }

    clear() { this.dom.remove(); }
}

function drawGrid(level) {
    return elt("table", {
        class: "background",
        style: `width: ${level.width * scale}px`
    }, ...level.rows.map(row =>
        elt("tr", { style: `height: ${scale}px; max-height: ${scale}px` },
            ...row.map(type => elt("td", { class: type })))
    ));
}

function drawActors(actors) {
    return elt("div", {}, ...actors.map(actor => {
        let rect;
        if (actor.type == "addOn") {
            rect = elt("div", { class: `actor ${actor.type} ${actor.power}` })
        } else {
            rect = elt("div", { class: `actor ${actor.type}` });
        }
        rect.style.width = `${actor.size.x * scale}px`;
        rect.style.height = `${actor.size.y * scale}px`;
        rect.style.left = `${actor.pos.x * scale}px`;
        rect.style.top = `${actor.pos.y * scale}px`;
        return rect;
    }))
}



////// U P D A T ES /////////


DOMDisplay.prototype.syncState = function (state) {
    if (this.actorLayer) this.actorLayer.remove();
    this.actorLayer = drawActors(state.actors);
    this.dom.appendChild(this.actorLayer);
    this.dom.className = `game ${state.status}`;

}

Level.prototype.touches = function (pos, size, direction = 1) {


    if (direction) {
        let xStart = Math.floor(pos.x);
        let xEnd = Math.ceil(pos.x + size.x);
        let yStart = Math.floor(pos.y);
        let yEnd = Math.ceil(pos.y + size.y);
        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                let isOutside = x < 0 || x >= this.width ||
                    y < 0 || y >= this.height;
                let here = isOutside ? "wall" : this.rows[y][x];
                if (here == "empty") here = this.solidActors[y][x];
                if (here != undefined) return here;
            }
        }
    } else {
        let xStart = Math.floor(pos.x);
        let xEnd = Math.floor(pos.x + size.x);
        let yStart = Math.floor(pos.y);
        let yEnd = Math.floor(pos.y + size.y);
        for (let y = yEnd; y >= yStart; y--) {
            for (let x = xEnd; x >= xStart; x--) {
                let isOutside = x < 0 || x >= this.width ||
                    y < 0 || y >= this.height;
                let here = isOutside ? "wall" : this.rows[y][x];
                if (here == "empty") here = this.solidActors[y][x];
                if (here != undefined) return here;
            }
        }
    }
    return undefined;
}

State.prototype.update = function (time, keys) {
    let bombs = [];
    let actors = this.actors.map(actor => {
        if (actor instanceof Bomb) {
            bombs.push(actor);
            return actor;
        }
        return actor.update(time, this, keys)
    });

    let newState = new State(this.level, actors, this.status);

    if (newState.status != "playing") return newState;
    if (keys.e) {
        newState = newState.player.bag.putBomb(newState);
    }

    for (let bomb of bombs) {
        newState = bomb.update(time, newState);
    }

    let player = newState.player;

    for (let actor of newState.actors) {
        if (actor != player && overlap(actor, player)) {
            newState = actor.collide(newState);
        }
        if (actor.delay <= 0) {
            if (actor.type == "bomb") {
                newState = actor.explode(newState);
            }
            let filtered = newState.actors.filter(item => item != actor);
            newState = new State(this.level, filtered, newState.status);
        }
    }

    return newState;
}



/////////C O L I S I O N E S//////////


function overlap(actor1, actor2) {
    return actor1.pos.x + actor1.size.x > actor2.pos.x &&
        actor1.pos.x < actor2.pos.x + actor2.size.x &&
        actor1.pos.y + actor1.size.y > actor2.pos.y &&
        actor1.pos.y < actor2.pos.y + actor2.size.y;
}

AddOn.prototype.collide = function (state) {
    let player = state.player;
    let bag = player.bag;
    let { bombs, maxBombs, bombRange, speed } = bag.items;

    if (this.power == "moreBombs") {
        bombs += 1;
        maxBombs += 1;
    }
    else if (this.power == "explosionRange") {
        bombRange = bombRange.plus(new Vec(1, 1));
    }
    else if (this.power == "moreSpeed") {
        speed += 1;
    }

    let newBag = new Bag({ bombs: bombs, maxBombs: maxBombs, bombRange: bombRange, speed: speed }, bag.delay);
    let newPlayer = new Player(player.pos, speed, newBag);
    let filtered = state.actors.filter(a => a != this && a != player);

    filtered.push(newPlayer);

    return new State(state.level, filtered, state.status);
}

Brick.prototype.collide = function (state) {
    return state;
}

Bomb.prototype.collide = function (state) {
    return state;
}

Explosion.prototype.collide = function (state) {
    return new State(state.level, state.actors, "lost");
}



////////  U P D A T E S //////////
AddOn.prototype.update = function (time) {
    let motion = this.motion + time * motionSpeed;
    let motionPos = Math.sin(motion) * motionDist;
    return new AddOn(this.basePos.plus(new Vec(0, motionPos)), this.basePos, motion, this.power);
}

Brick.prototype.update = function () {
    return new Brick(this.pos);
}

Bomb.prototype.update = function (time, state) {

    let newSolids = state.level.solidActors;
    let level = state.level;
    let speed = this.speed;
    let pos = this.pos;
    //console.log(pos,speed,this.size);
    let moved = pos.plus(new Vec(speed.x * time / 3, speed.y * time / 3 ));
    let touch;

    if (this.speed.x < 0 || this.speed.y < 0) {
        touch = state.level.touches(moved, this.size, 1);
    } else {
        touch = state.level.touches(moved, this.size, 0);
    }


    if (!(touch == "wall" || touch == "brick")) {
        pos = moved;
        let lastX = Math.floor(this.pos.x);
        let newX = Math.floor(moved.x);
        let lastY = Math.floor(this.pos.y);
        let newY = Math.floor(moved.y);
        if (lastX != newX || lastY != newY) {
            newSolids[lastY][lastX] = undefined;
            newSolids[newY][newX] = "bomb";

        }
    } else {
        speed = new Vec(0, 0);
    }
    if (!overlap(this, state.player) && !this.isSolid) {
        let x = Math.floor(this.pos.x);
        let y = Math.floor(this.pos.y);
        newSolids[y][x] = "bomb";
        this.isSolid = true;
    }


    let newBomb = new Bomb(pos, this.range, this.delay - time, this.isSolid, speed);
    let newLevel = new Level(level.width, level.width, level.startAtors, newSolids, level.rows);
    let newActors = state.actors.map(actor => actor != this ? actor : newBomb);

    return new State(newLevel, newActors, state.status);
}

Explosion.prototype.update = function (time) {
    return new Explosion(this.pos, this.delay - time);
}

Player.prototype.update = function (time, state, keys) {

    let xSpeed = 0;
    if (keys.a) xSpeed -= this.bag.items.speed;
    if (keys.d) xSpeed += this.bag.items.speed;

    let pos = this.pos;
    let movedX = pos.plus(new Vec(xSpeed * time, 0));
    let movedToX = state.level.touches(movedX, this.size);

    if (!movedToX) {
        pos = movedX;
    } else if (movedToX == "bomb") {
        for (let actor of state.actors) {
            if (actor.type != "bomb") continue;
            if (overlap(
                { size: this.size.plus(new Vec(1, 0)), pos: movedX },
                { size: actor.size.plus(new Vec(1, 0)), pos: actor.pos })) {
                actor.speed = new Vec(xSpeed, 0);
                break;
            }
        }
    } 

    let ySpeed = 0;

    if (keys.w) ySpeed -= this.bag.items.speed;
    if (keys.s) ySpeed += this.bag.items.speed;

    let movedY = pos.plus(new Vec(0, ySpeed * time));
    let movedToY = state.level.touches(movedY, this.size);
    if (!movedToY) {
        pos = movedY;
    } else if (movedToY == "bomb") {
        for (let actor of state.actors) {
            if (actor.type != "bomb") continue;
            if (overlap(
                { size: this.size.plus(new Vec(0, 1)), pos: movedY },
                { size: actor.size.plus(new Vec(0, 1)), pos: actor.pos })) {
                actor.speed = new Vec(0, ySpeed);
                break;
            }
        }
    }

    let bag = this.bag;
    if (bag.delay < 0) {
        bag.delay = bagCd;
        bag.items.bombs = Math.min(bag.items.bombs + 1, bag.items.maxBombs);
    } else {
        bag.delay -= time;
    }
    return new Player(pos, new Vec(xSpeed, ySpeed), bag);
}






//////// W O R K I N G  W I T H  B O M B S //////////

Brick.prototype.explode = function (state) {
    let level = state.level;
    let solids = level.solidActors;

    solids[this.pos.y][this.pos.x] = undefined;
    let newLevel = new Level(level.height, level.width, level.startActors, solids, level.rows);

    let filtered = state.actors.filter(item => item != this);
    if ((Math.random() * 10) <= probability) {
        filtered.push(AddOn.create(this.pos));
    }

    return new State(newLevel, filtered, state.status);
}

Bag.prototype.putBomb = function (state) {
    let player = state.player;
    let newActors = state.actors;
    let actualBombs = state.actors.filter(actor => actor.type == 'bomb');

    if (this.delay <= 0 || this.items.bombs > 0) {
        const bombPos = new Vec(0, 0);

        if (player.pos.x % 1 < .5) {
            bombPos.x = Math.floor(player.pos.x);
        } else {
            bombPos.x = Math.ceil(player.pos.x);
        }
        if (player.pos.y % 1 < .5) {
            bombPos.y = Math.floor(player.pos.y);
        } else {
            bombPos.y = Math.ceil(player.pos.y);
        }

        let bomb = Bomb.create(bombPos, this.items.bombRange);
        let isPlaced = actualBombs.some(({ pos }) => bomb.pos.isEqual(pos));

        if (!isPlaced) {
            let items = this.items;
            items.bombs -= 1;
            let newBag = new Bag(items, bagCd);
            let newPlayer = new Player(player.pos, player.speed, newBag);
            newActors = [...state.actors.filter(actor => actor != player), newPlayer, bomb];
        }
    }
    return new State(state.level, newActors, state.status);
}


Bomb.prototype.explode = function (state) {
    const actors = state.actors;
    const items = actors.filter(actor => actor != this && (actor.type == "brick" || actor.type == "bomb"));
    const itemsExploded = [];
    const level = state.level;
    const solids = level.solidActors;

    let posY = Math.floor(this.pos.y);
    let posX = Math.floor(this.pos.x);
    solids[posY][posX] = undefined;

    actors.push(Explosion.create(new Vec(posX, posY)));

    for (let x = 0, touches = false; x >= -this.range.x; x--) {
        if (touches) break;
        let exp = Explosion.create(new Vec(x + posX, posY));
        if (state.level.touches(exp.pos, exp.size) == "wall") break;
        actors.push(exp);
        for (let item of items) {
            if (overlap(exp, item)) {
                touches = true;
                itemsExploded.push(item);
                break;
            }
        }
    }
    for (let x = 0, touches = false; x <= this.range.x; x++) {
        if (touches) break;
        let exp = Explosion.create(new Vec(x + posX, posY));
        if (state.level.touches(exp.pos, exp.size) == "wall") break;
        actors.push(exp);
        for (let item of items) {
            if (overlap(exp, item)) {
                touches = true;
                itemsExploded.push(item);
                break;
            }
        }

    }
    for (let y = 0, touches = false; y >= -this.range.y; y--) {
        if (touches) break;
        let exp = Explosion.create(new Vec(posX, posY + y));
        if (state.level.touches(exp.pos, exp.size) == "wall") break;
        actors.push(exp);
        for (let item of items) {
            if (overlap(exp, item)) {
                touches = true;
                itemsExploded.push(item);
                break;
            }
        }

    }
    for (let y = 0, touches = false; y <= this.range.y; y++) {
        if (touches) break;
        let exp = Explosion.create(new Vec(posX, posY + y));
        if (state.level.touches(exp.pos, exp.size) == "wall") break;
        actors.push(exp);
        for (let item of items) {
            if (overlap(exp, item)) {
                touches = true;
                itemsExploded.push(item);
                break;
            }
        }

    }

    let newLevel = new Level(level.height, level.width, level.startActors, solids, level.rows);
    let newState = new State(newLevel, actors, state.status);

    for (let item of itemsExploded) {
        if (item.type != 'brick') {
            item.delay = 0.002;
        } else {
            newState = item.explode(newState);
        }
    }

    return newState;
}


/////// T R A C K  K E Y S //////////
function trackKeys(keys) {
    let down = Object.create(null);
    function track(event) {
        if (keys.includes(event.key)) {
            down[event.key] = event.type == "keydown";
            event.preventDefault();
        }
    }
    window.addEventListener('keydown', track);
    window.addEventListener('keyup', track);
    return down;
}






/////// R U N  L E V E L ///////////
function runAnimation(frameFunc) {
    let lastTime = null;
    function frame(time) {
        if (lastTime != null) {
            let timeStep = Math.min(time - lastTime, 100) / 1000;
            if (frameFunc(timeStep) === false) return;
        }
        lastTime = time;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}


function runLevel(level, Display) {
    const main = document.getElementById("main");
    let display = new Display(main, level);
    let state = State.start(level);
    let ending = 1;
    return new Promise(resolve => {
        runAnimation(time => {
            state = state.update(time, arrowKeys);
            display.syncState(state);
            if (state.status == 'playing') {
                return true;
            } else if (ending > 0) {
                ending -= time;
                return true;
            } else {
                display.clear();
                resolve(state.status);
                return false;
            }
        });
    });
}

async function runGame(plans, Display) {
    for (let level = 0; level < plans.length;) {
        let status = await runLevel(Level.create(plans[level]), Display);
        resetAll();
        if (status == "won") level++;
    }
    console.log("You've won!");
}





const levelTest = `
====================
=...############..#=
=.........%..###...=
=............###...=
=............#.#...=
=...........@=.=...=
=............=.=...=
=.........#..=.=...=
=..................=
=..................=
====================
`;

const finalLevel = `
=============
=@.#######..=
=.=#=#=#=#=.=
=###########=
=#=#=#=#=#=#=
=###########=
=#=#=#=#=#=#=
=###########=
=#=#=#=#=#=#=
=###########=
=#=#=#=#=#=#=
=###########=
=.=#=#=#=#=.=
=..#######..=
=============
`
levels = [levelTest];
runGame(levels, DOMDisplay);

console.log(new Level(levelTest));