var keys_down = [];
var game_state = 0; // 0: Title screen. 1: Help screen. 2: Play. 3: Game over.
var thing = new PVector(); // Represents either the laser or the pin.
var angle, balloons, last_b_spawn_time, lives, lives_blinker, need_poison, pop_streak, pops, score, weapon;

var heart = getImage("cute/Heart"); // should be const
var start_lives = 5;                // should be const
var max_balloon_size = 50;          // should be const
var pop_time = 50;                  // should be const
var lives_blink_time = 20;          // should be const
var thing_len = 15;                 // should be const
var PIN = 0;                        // should be const
var LASER = 1;                      // should be const

var g_sounds = [];
/*
This comment is a workaround for a bizarre KhanAcademy bug.
getSound("rpg/coin-jingle");
getSound("retro/whistle1");
getSound("retro/jump2");
getSound("retro/hit2");
getSound("retro/whistle2");
getSound("retro/thruster-long");
*/
["rpg/coin-jingle", "retro/whistle1", "retro/jump2", "retro/hit2", "retro/whistle2", "retro/thruster-long"].forEach(function(el) {
    g_sounds[el] = getSound(el);
});

ellipseMode(RADIUS);
loop();

var lost_life = function() {
    pop_streak = 0;
    if (game_state !== 3) {
        playSound(g_sounds["retro/whistle1"]);
    }
    lives--;
    lives_blinker += lives_blink_time;
};

var start_game = function() {
    game_state = 2;
    frameRate(30);
    playSound(g_sounds["retro/thruster-long"]);
    angle = 0;
    balloons = [];
    last_b_spawn_time = 0;
    lives = start_lives;
    lives_blinker = 0;
    need_poison = 0;
    pop_streak = 0;
    pops = 0;
    score = 0;
    thing.set(200, 200, 0);
};

keyPressed  = function() {
    if (game_state === 1) {
        if (key.toString() === '1') {
            weapon = PIN;
        } else if (key.toString() === '2') {
            weapon = LASER;
        } else {
            return;
        }
        start_game();
    } else if ((game_state === 3) && (keyCode === ENTER)) {
        game_state = 1;
    }
    keys_down[keyCode] = true;
};

keyReleased = function() {
    keys_down[keyCode] = false;
};

mouseClicked = function() {
    if (game_state === 0) {
        playSound(g_sounds["rpg/coin-jingle"]);
        game_state = 1;
    } else if ((game_state === 1) && (mouseY > 265)) {
        if (mouseX < 200) {
            weapon = PIN;
        } else if (mouseX > 245) {
            weapon = LASER;
        } else {
            return;
        }
        start_game();
    } else if (game_state === 3) {
        game_state = 1;
    }
};

var title = function(str, x, y, blur_size, blur_alpha, col_text, col_outline) {
    if (col_outline !== undefined) {
        fill((col_outline & 0x00ffffff) | (blur_alpha<<24));
    }
    for (var a = 0; a < 360; a += 10) {
        if (col_outline === undefined) {
            fill(lerpColor(
                    lerpColor(col_text, 0, 0.9),
                    lerpColor(col_text, color(255,255,255), 0.4),
                    cos(a+120)>0?1:((cos(a+120)+1)/2)
                )
                & 0x00ffffff
                | (blur_alpha<<24)
            );
        }
        text(str, x+blur_size*cos(a), y+blur_size*sin(a));
    }
    fill(col_text);
    text(str, x, y);
};

var Balloon = function(r, type) {
    this.vec = new PVector(random(r, width-r), height+r);
    this.r = r;
    this.type = type;
};
Balloon.NORMAL = 0;
Balloon.HEART  = 1;
Balloon.POISON = 2;

Balloon.prototype.move_and_draw = function() {
    if (this.type === Balloon.HEART) {
        if (!('popped' in this) || (this.popped < 10 && this.popped % 2 === 0)) {
            image(heart, this.vec.x-51, this.vec.y-87);
            this.vec.y -= 1;
        }
        textSize(35);
        var fade = 1;
        if (this.popped > 10) {
            fade = (pop_time-this.popped)/(pop_time-10);
        }
        title("1 UP", this.vec.x-37, this.vec.y+5, 2,
            max(1,45*fade), color(255,0,0,max(1,255*fade)), 0);
    } else {
        var b_col = this.type === Balloon.POISON ? 0 :
            color(this.r*255/max_balloon_size, 0, 255-this.r*255/max_balloon_size);
        fill(b_col);
        stroke(lerpColor(b_col, color(255,255,255,150), 0.4));
        var col_bal_string = color(100, 100, 100);
        if (!('popped' in this)) {
            this.vec.y -= (this.r-5)/(max(10, 30-pops/4));
            strokeWeight(this.r/10+1);
            ellipse(this.vec.x, this.vec.y, this.r, this.r);
            stroke(col_bal_string);
        } else {
            this.vec.y+=min(2, this.popped/pop_time*3-(this.r-5)/(max(10,30-pops/4)+0));
            this.vec.x += 0.2;
            if (this.popped < 5) {
                fill((b_col&0x00ffffff)|(100-this.popped*20)<<24);
                strokeWeight(4);
                ellipse(this.vec.x, this.vec.y, this.r+this.popped, this.r+this.popped);
            }
            stroke((col_bal_string&0x00ffffff)|255*(1-this.popped/pop_time)<<24);
            fill((0x00ffff00)|255*(1-this.popped/pop_time)<<24);
            textSize(20);
            text(this.pop_scored, this.vec.x-10, this.vec.y+5);
        }
        strokeWeight(2);
        noFill();
        bezier(this.vec.x,                                this.vec.y+this.r,
               this.vec.x+10- 5*sin(frameCount*4+this.r), this.vec.y+this.r+15,
               this.vec.x+10+ 5*sin(frameCount*4+this.r), this.vec.y+this.r+40,
               this.vec.x+10+ 5*sin(frameCount*4+this.r), this.vec.y+this.r*2+35);
    }
};

Balloon.prototype.is_hit = function(points) {
    for (var i = 0; i < points.length; i++) {
        if (points[i].dist(this.vec) < this.r) {
            return true;
        }
    }
    return false;
};

var draw_pin = function() {
    fill(0, 0, 0);
    stroke(155, 155, 155);
    var points = [
        PVector.add(thing, PVector.mult(PVector.fromAngle(angle  ), thing_len)),
        PVector.sub(thing, PVector.mult(PVector.fromAngle(angle+9), thing_len)),
        PVector.sub(thing, PVector.mult(PVector.fromAngle(angle-9), thing_len))
    ];
    strokeWeight(1);
    triangle(points[0].x,points[0].y,points[1].x,points[1].y,points[2].x,points[2].y);
    return points;
};

var draw_laser = function() {
    fill(255, 242, 0, 50);
    stroke(255, 234, 0, 200);
    strokeWeight(3);
    triangle(-7, 7, 7, -7, thing.x, thing.y);
    stroke(255, 234, 0, 255);
    strokeWeight(4);
    line(thing.x*0.85, thing.y*0.85, thing.x, thing.y);
    return [thing];
};

draw = function() {
    var speed = 10;                      // should be const
    var angle_speed = 10;                // should be const
    var title_red = color(255, 100, 50); // should be const
    var title_grn = color(13, 184, 67);  // should be const
    var col_back = color(230,230,255);   // should be const
    background(col_back);
    if (game_state === 0) {
        frameRate(10);

        // Draw some soothing clouds.
        noStroke();
        fill(255,255,255);
        for (var i = 0; i < width; i+= 60) {
            ellipse(i, height+sin(i+160+frameCount*2)*10-30, 45+sin((i+10)*4)*10, 35+sin(i*4)*10);
            ellipse(i, height+sin(i+160+frameCount*2)*10+30, 45+sin((i+10)*4)*10, 60);
        }

        textSize(122);
        textFont(createFont("comic sans ms"));
        title("Balloon", -4, 98, 4, 45, title_red);
        title("Popper", 4, 228, 4, 45, title_red);
        textSize(162);
        textFont(createFont("sans-serif"));
        title("2!", 135, 393, 4, 45, title_red);
        textSize(215);
        noFill();
        strokeWeight(2);
        stroke(0); // color for the bezier balloon strings, should match title outline
        bezier(300, 104, 290, 111, 299, 113, 284+10*sin(frameCount*15), 129);
        bezier(230, 104, 236, 111, 269, 103, 284+10*sin(frameCount*15), 129);
        bezier(284+10*sin(frameCount*15), 129, 286, 141, 319, 143, 320-10*sin(frameCount*15), 155+7*sin(frameCount*15));
        textSize(54);
        var mrpants_col = color(63, 171, 133);
        title("Click", 279, 295, 2, 45, mrpants_col);
        title("to",    321, 340, 2, 45, mrpants_col);
        title("play",  291, 385, 2, 45, mrpants_col);
        image(getImage("avatars/mr-pants"), -1, 273); // My self-portrait
        return;
    }
    if ((game_state === 2) && !focused) {
        textSize(60);
        title("Click\n    to\n     resume...", 35, 150, 2.5, 45, title_grn);
        return;
    }
    if (game_state === 1) {
        frameRate(10);
        textSize(60);
        title("How to play:", 35, 50, 2.5, 45, title_grn);
        textSize(18);
        fill(0, 0, 0);
        text(
            "- When a normal balloon goes off the top\n"+
            "  you lose a life.\n"+
            "- Popping a heart grants an extra life.\n"+
            "- Let the black poison balloons go -\n"+
            "  popping them costs a life!\n\n"+
            "Now - pick your weapon!\n\n",
            35, 85);

        text("Use the arrow keys to fly\n"+
            "your balloon-popping pin\n"+
            "around the screen.\n\n", 5, 280);

        text("Use the mouse to\n"+
            "guide the laser\n"+
            "machine.\n\n", 250, 280);
        angle = frameCount*10;
        textSize(30);
        title("1: Pin", 55, 350, 1.5, 45, title_grn);
        thing.set(100, 370);
        draw_pin();

        title("2: Laser", 255, 350, 1.5, 45, title_grn);
        thing.set(320+50*sin(frameCount*20), 370);
        draw_laser();
        return;
    }
    if (game_state === 3) {
        textSize(100);
        title("Game",  46+random(8),  80+random(8), 4, 45, title_red);
        title("Over!", 61+random(8), 180+random(8), 4, 45, title_red);
        textSize(57);
        title("Score: "+score+"\nPops: "+pops, 10, 280, 2.5, 35, title_grn);
        fill(0, 0, 0);
        textSize(20);
        text("Click or hit Enter to play again.", 10, height-5);
    }

    for (var i = balloons.length-1; i >= 0; i--) {
        balloons[i].move_and_draw();
    }

    var points;
    if (game_state === 2) {
        // Background clouds.
        noStroke();
        fill(255,255,255);
        for (var i = 0; i < width; i+= 60) {
            ellipse(i, height+sin(i+160)*10-30, 45+sin((i+10)*4)*10, 35+sin(i*4)*10);
        }

        if (weapon === PIN) {
            if (keys_down[UP])   {thing.add(PVector.mult(PVector.fromAngle(angle), speed));}
            if (keys_down[DOWN]) {thing.add(PVector.mult(PVector.fromAngle(angle),-speed));}
            if (keys_down[RIGHT]){ angle += angle_speed; }
            if (keys_down[LEFT]) { angle -= angle_speed; }
            if (thing.x < -thing_len/2) { thing.x = width +thing_len/2; }
            if (thing.y < -thing_len/2) { thing.y = height+thing_len/2; }
            if (thing.x > width +thing_len/2) { thing.x = -thing_len/2; }
            if (thing.y > height+thing_len/2) { thing.y = -thing_len/2; }
            points = draw_pin();
        } else {
            var mouse_dir = new PVector(mouseX, mouseY);
            mouse_dir.sub(thing.x, thing.y, 0);
            mouse_dir.limit(speed*0.5);
            thing.add(mouse_dir);
            points = draw_laser();
        }
        // Time to spawn a balloon? (Spawn rate and max concurrent changes with pops.)
        if (
            (frameCount - last_b_spawn_time > 1000/(100+pops)) &&
            (balloons.length < max(10, pops / 20))
        ) {
            last_b_spawn_time = frameCount;
            balloons.push(new Balloon(random(10, max_balloon_size), need_poison ? Balloon.POISON : Balloon.NORMAL));
            if (need_poison) {
                need_poison--;
            }
        }
    }

    for (var i = balloons.length-1; i >= 0; i--) {
        // Cull the popped ones from the array.
        if ('popped' in balloons[i]) {
            if (balloons[i].popped++ >= pop_time) {
                balloons.splice(i, 1);
            }
            // Otherwise, ignore interactions, because it's already been popped.
        } else if ((game_state === 2) && balloons[i].is_hit(points)) {
            // It got hit by the pin.
            if (balloons[i].type === Balloon.HEART) {
                balloons[i].popped = 0; // cull after pop_time
                if (lives < 10) {
                    lives++;
                    playSound(g_sounds["retro/jump2"]);
                    playSound(g_sounds["retro/whistle2"]);
                }
            } else if (balloons[i].type === Balloon.POISON) {
                balloons[i].popped = 0; // cull after pop_time
                lost_life();
            } else {
                playSound(g_sounds["retro/hit2"]);
                balloons[i].popped = 0; // cull after pop_time
                pops++;
                pop_streak++;
                score += min(10, pop_streak);
                balloons[i].pop_scored = min(10, pop_streak);
                if ((lives < 10) && (pops % 20 === 0)) {
                    balloons.push(new Balloon(39, Balloon.HEART));
                } else if ((pops > 10) && (pops % 20 === 10)) {
                    need_poison++;
                }
            }
        } else if (balloons[i].vec.y < -balloons[i].r*3-35) {
            // It flew off the top of the screen.
            if (balloons[i].type === Balloon.NORMAL) {
                lost_life();
            }
            balloons.splice(i, 1); // instant cull
        }
    }

    if (lives <= 0) {
        game_state = 3;
    }

    if (game_state === 2) {
        // Foreground clouds.
        noStroke();
        fill(255,255,255);
        for (var i = 0; i < width; i+= 60) {
            ellipse(i, height+sin(i)*20, 45+sin(i*4)*10, 30+sin(i*4)*10);
        }

        if (lives_blinker > 0) {
            lives_blinker--;
        }
        var display_lives= lives_blinker%2 ? lives+lives_blinker/lives_blink_time:lives;
        for (var i = 0; i < display_lives; i++) {
            image(heart, width-20*(i+1), height-30, 20.2, 34.2);
        }

        textSize(20);
        title("Pops: "+pops+"\nScore: "+score, 0, height-30, 3, 255, 0, color(255,255,255));
    }
};
