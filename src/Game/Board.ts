import {Piece} from "./Piece";
import {Player} from "./Player";
import {Game} from "./Game"
import {Pos} from "./Pos";
import {PieceManager} from "./PieceManager";
import {Simulate} from "react-dom/test-utils";
import error = Simulate.error;

export class Board {

    readonly game: Game;

    size: Pos;

    grids : Grid[][];
    g(x : number, y : number) : Grid {
        return this.grids[y][x];
    }
    p(pos : Pos) : Grid {
        return this.g(pos.x, pos.y);
    }

    constructor(game: Game, size: Pos) {
        this.game = game;
        this.size = size;
        this.grids = [];

        for (let y = 0; y < size.y; y++) {
            this.grids[y] = [];
            for (let x = 0; x < size.x; x++) {
                this.grids[y][x] = new Grid();
            }
        }
    }

    static newBoard(game: Game, data: string[], players: Player[]): Board {
        console.log(`Start newBoard(), player [${players.length}]`)
        console.log(`- for reference - Piece Static -`);
        console.log(game.pieces.statics);

        let size: Pos = Pos.p(data.length, data[0].length);
        let board: Board = new Board(game, size);

        //遍历玩家
        for (let p = 0; p < players.length; p++) {
            //y: 0=>8
            for (let y = 0; y < data.length; y++) {

                //读取 data 的底部是第八行, 而不是第零行, 8=>0
                let y2 = data.length-y-1

                //x: 0=>8
                for (let x = 0; x < data[y2].length; x++) {
                    //从底部阅读到顶部, 从左侧阅读到右侧
                    let symbol = data[y2][x];

                    //如果是空格子, 跳过
                    //console.log(`symbol(${x}, ${data.length-y-1}): ${symbol}`);
                    if (symbol === " ") continue;
                    //console.log("B");

                    let d = players[p].direction;

                    //否则生成棋子,
                    //如果 direction 是正数, 就从左下角(0, 0)往右上角数
                    //如果 direction 是负数, 就从左下角(8, 8)往左下角数
                    board.generatePieceS(symbol, players[p],
                        d >= 0 ? x : size.x-x-1,
                        d >= 0 ? y : size.y-y-1);
                }
            }
        }
        return board;
    }

    //生成有给定符号的棋子
    generatePieceS(symbol: string, player: Player, x: number, y: number): void {
        console.log(`start generate piece ${symbol} at (${x}, ${y})`);
        this.place(this.game.pieces.generatePieceS(symbol, this, player), new Pos(x, y));
    }

    toString(): string {
        let result: string = "";
        for (let y = this.grids.length - 1; y >= 0; y--) {
            for (let x = 0; x < this.grids[y].length; x++) {
                result += this.g(x, y);
            }
            result += "\n";
        }
        return result;
    }


    handleClick(x : number, y : number, player : Player) : void {
        console.log(`Handle Click: (${x},${y}), player: ${player.direction/*_getData()*/}`)
        let currentPiece = this.g(x, y).piece;

        if (player.selectedPiece === null ||
            (currentPiece?.player === player && currentPiece !== player.selectedPiece)) {
            //如果没有选择棋子
            //或点击的格子是属于玩家的棋子, 且不等于当前选择的棋子 那么选择格子

            console.log(currentPiece);
            console.log(`- belong to current player? ${currentPiece?.player === player}`);
            if (currentPiece !== null && currentPiece.player === player) {
                player.select(currentPiece);
                //获取该棋子可移动的格子, 设置高亮
            }
        }
        else {
            //如果已经选择了棋子
            //且点选的格子不属于自己, 或是点选已选择的格子
            //那么判断是否能够移动
            //移动棋子, 如果点选了无法移动的格子会返回 false
            if (this.tryMove(player.selectedPiece, new Pos(x, y))){
                this.game.players.nextPlayer();
                console.log("-------- turn ends --------")
            }
            //清除已选棋子;
            player.selectedPiece = null;
        }

    }

    f(g: Game){

        let x = 0;
        let y = 0;
        let piece = g.board.g(x, y).piece as Piece;
        let grids = g.board.getValidWalkableGrids(piece);
        let output : string = "";
        for (let iy= 0; iy < 9; iy++) {
            for (let ix= 0; ix < 9; ix++) {
                output += (grids.find((pos) => pos.x === ix && pos.y === iy))? "x" : "0";
            }
            output += "\n";
        }

        console.warn(`piece ${piece.name}, walkable Grids: ${"\n" +output}`);
    }

    isValidWalkableGrid(piece: Piece | null, pos: Pos): boolean {
        return piece !== null &&
            piece.isWalkable(piece.rX(pos.x), piece.rY(pos.y)) &&
            this.isValidMove(piece, new Pos(pos.x, pos.y));

    }
    //给定棋子, 获取该棋子 可移动的格子坐标列表
    getValidWalkableGrids(piece: Piece | null): Pos[] {
        if (piece === null) return [];

        //调用 piece 的函数, 获取 piece 可以移动的格子
        let walkableGrids: Pos[]
            = piece.getWalkableGrids(this.size);
        //输出判断合法性前的格子数量
        console.log(`No of WalkableGrids = ${walkableGrids.length}`);
        console.log(walkableGrids);

        //遍历 piece 可移动的格子, 从棋盘角度判断移动合法性(会不会导致被诘将)
        let walkableGrids2: Pos[] = [];
        walkableGrids.forEach(
            (pos) => {
                if(this.isValidMove(piece, pos)) walkableGrids2[walkableGrids2.length] = pos;
            });
        //输出判断合法性后的格子数量
        console.log(`No of Valid WalkableGrids = ${walkableGrids2.length}`);

        return walkableGrids2;
    }

    //检查棋子是否可以移动 (是否会将军等问题)
    isValidMove(piece: Piece, pos: Pos): boolean {
        // if(/*正在将军*/) {
        //     //检查移动后是否解决将军
        //     if (/*没解决*/) return false;
        // }
        //
        // if (/*移动后导致被将军*/) {
        //     return false;
        // }

        return true;
    }

    tryMove(piece: Piece, pos: Pos): boolean {
        console.log(`- try move ${piece.id} to ${pos}`);

        //如果不是可移动的格子, 直接返回假
        if (!this.isValidWalkableGrid(piece, pos)) {
            console.log(`- not valid movable grid`)
            return false;
        }

        //如果目标格子有敌对棋子, 捕获它
        let piece2 = this.p(pos).piece;
        if (piece2 !== null){
            if (piece.player.isEnemy(piece2.player)) {
                console.log(`- capture ${piece2.id}`);
                this.capturePiece(piece.player, piece2);
            }
        }

        console.log(`- move ${piece.id} to ${pos}`);
        //移动棋子
        this.move(piece, pos);

        return true;
    }

    private remove(piece: Piece){
        this.p(piece.pos).piece = null;
        piece.onBoard = false;
    }
    private place(piece: Piece, pos: Pos) {
        piece.pos = pos;
        this.p(pos).piece = piece;
        piece.onBoard = true;
    }
    //移动棋子, 如果目标格子被占据会报错
    private move(piece: Piece, pos: Pos){
        if (this.occupied(pos))
            throw new Error(`Piece ${piece} tried to move to Grid ${pos} which has been occupied by ${this.p(pos).piece}`);
        //把棋子从棋盘上移走
        this.remove(piece);
        this.place(piece, pos);
    }
    //返回格子是否被占据
    occupied(pos: Pos): boolean {
        return this.p(pos).piece !== null;
    }

    capturePiece(player: Player, piece: Piece): void {
        //把棋子添加到玩家的持驹台
        player.addCapturePiece(piece);
        //移除棋盘上的棋子
        this.p(piece.pos).piece = null;
    }


}

export class Grid{
    piece : Piece | null = null;

    constructor(piece : Piece | null = null) {
        this.piece = piece;
    }
    toString(): string {
        return this.piece ? this.piece.symbol : " ";
    }

    belongTo = (player : Player) => this.piece !== null && this.piece.belongTo(player);
}