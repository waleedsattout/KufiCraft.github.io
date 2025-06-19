/**
 * Main board object containing SVG workspace, drawing data, settings, and drawing tools.
 * @namespace board
 */
import { Board, BoardSettings, DrawingTools, Point, BoardItem, ShapeItem, ArchItem, LineItem, ScrollingState } from './interfaces';

const $ = document.querySelector.bind(document),
    $$ = document.querySelectorAll.bind(document)

/**
 * Board object for managing the drawing workspace, tools, and settings.
 * @type {Board}
 */
const board: Board = {
    svg: $('#kufi') as SVGElement,
    workspace: document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement,
    data: [],
    /**
     * Board settings and state.
     * @type {BoardSettings}
     */
    settings: {
        isPainting: false,
        currentTool: 'pen',
        currentColor: 'black',
        lastSavedBoard: 'default',
        scrolling: {
            is: false,
            startX: 0,
            scrollLeft: 0,
            startY: 0,
            scrollTop: 0
        },
        toBeRemovedElements: [],
        dummy: {},
        archDir: 1,
        drawingShape: 'square',
        linePoints: [],
        /**
         * Get the current tool.
         * @returns {string}
         */
        get tool(): string {
            return this.currentTool;
        },
        /**
         * Set the current tool.
         * @param {string} tool
         */
        set tool(tool: string) {
            this.currentTool = tool;
            if ($('[name=arch]:checked') && tool != 'arch') ($('[name=arch]:checked') as HTMLInputElement).checked = false;
            if ($('[name=pen]:checked') && tool != 'pen') ($('[name=pen]:checked') as HTMLInputElement).checked = false;
            let container = $('#container') as HTMLElement;
            if (tool == "hand") {
                container.classList.add('hand');
                this.notify('info', 'اضغط مرتين على اليد للمحاذاة إلى المنتصف');
            } else {
                container.classList.remove('hand');
                board.drawingTools.resets();
            }
            if (tool == 'line') {
                this.notify('info', 'حدد نقطتين مختلفتين للوصل بينهما, لا يُستحسن استخدام هذه الأداة لرسم خطوط عمودية أو أفقية إذ لا يمكن رسم قوس عليها كما أنها تعامل كـ كتلة واحدة عند مسحها. تذكر استخدام الضفائر في تصميمك لجعله أكثر جمالية!');
                (board.drawingTools as any).lines = [];
            }
            if (tool == 'eraser') this.notify('info', 'يمكنك الضغط مع السحب لمسح عدة عناصر');
            if (tool == 'pen') this.notify('hint');
            if (tool == 'arch') this.notify('info', 'اختر مربعين لرسم قوس بينهما');
            if (tool != 'arch' || (tool == 'arch' && (this.dummy as any).type != 'arch')) {
                $$('.dummy').forEach(el => el.remove());
                this.dummy = {};
            }
            if (tool != 'line') this.linePoints = [];
            ($(`[name="tool"]#${tool}`) as HTMLInputElement).checked = true;
        },
        /**
         * Get the current color.
         * @returns {string}
         */
        get color(): string {
            return this.currentColor;
        },
        /**
         * Set the current color.
         * @param {string} color
         */
        set color(color: string) {
            this.currentColor = color;
            if (!($('#arch') as HTMLInputElement).checked) {
                board.settings.tool = 'pen';
                ($('#pen') as HTMLInputElement).checked = true;
            }
            this.notify('info', 'تم تغيير اللون');
        },
        /**
         * Snap the workspace to center view.
         */
        snap() {
            board.workspace.scrollIntoView({ inline: 'center', block: 'center', behavior: 'smooth' });
        },
        /**
         * Zoom the board in or out.
         * @param {number} [dir=1] - Direction (1=in, -1=out)
         */
        zoom(dir: number = 1) {
            let size = board.svg.clientWidth + 400 * dir;
            if (size <= 4000 && size >= 800) {
                (this as any).size = size;
                board.svg.style.setProperty('--size', size + 'px');
                this.snap();
                this.notify();
            } else {
                this.notify('warn', 'عذرًا، يوجد حدود لمعدل التكبير');
            }
        },
        /**
         * Show a notification message.
         * @param {string|false} [type] - Notification type ('info', 'warn', 'hint', false)
         * @param {string} [text]
         * @returns {true|undefined}
         */
        notify(type: string | false = false, text: string = ''): true | undefined {
            let list = [
                'يمكنك دائمًا تغيير لون الكتابة من خلال الضغط على زر الألوان في شريط الأدوات',
                'يمكنك تصدير اللوحة على شكل ملف SVG حيث يمكنك استخدامه في أي برنامج تصميم آخر',
                'تذكر استخدام اختصارات الكيبورد مثل: P لاستخدام القلم، E لاستخدام الممحاة، H لاستخدام اليد، L لرسم خط مستقيم، C لرسم قوس، Ctrl+S للحفظ، Ctrl+Z للتراجع — يمكنك معرفة الاختصار بالوقوف قليلاً فوق الأداة المطلوبة',
                'تم تطوير هذا التطبيق من AbdSattout',
                'يمكنك حفظ اللوحة في التطبيق دون الحاجة لتنزيلها للعودة مرة أخرى واستكمال العمل',
                'نسب الفراغ الافتراضية هي 1:3. يمكنك اختيار الشبكة المنتظمة عند بدء العمل',
                'الخط الكوفي أقدم الخطوط العربية',
                'تذكر أنك تستطيع مسح كل شيء في اللوحة بالضغط مرتين على الممحاة',
                'حافظ على توازن تصميمك، التصميم المتناظر مريح للعين',
                'حاول الالتزام بقواعد الخط الكوفي حتى تكون اللوحة مقروءة',
                'لا تترك فراغات في تصميمك',
                'لا بد من وجود رسالة وراء كل تصميم'
            ];
            switch (type) {
                case 'info':
                    ($('#notifications') as HTMLElement).textContent = `👈 ${text}`;
                    break;
                case 'warn':
                    ($('#notifications') as HTMLElement).textContent = `⚠️ ${text}`;
                    break;
                case 'hint':
                    ($('#notifications') as HTMLElement).textContent = `💡 ${list[Math.round(Math.random() * (list.length - 1))]}`;
                    break;
                default:
                    ($('#notifications') as HTMLElement).textContent = '';
                    return;
            }
            return true;
        },
        /**
         * Empty the workspace.
         * @returns {true}
         */
        empty(): true {
            board.workspace.textContent = '';
            this.notify('info', 'تم إعادة ضبط اللوحة');
            return true;
        }
    } as BoardSettings,
    /**
     * Drawing tools methods.
     * @type {DrawingTools}
     */
    drawingTools: {
        /**
         * Snap a point to the grid.
         * @param {number} x
         * @param {number} y
         * @returns {Point}
         */
        point(x: number, y: number): Point {
            return board.settings.isMonospaced ? {
                x: Math.ceil(x),
                y: Math.ceil(y)
            } : {
                x: (x - x % 1) * 2 + (x % 1 < 0.75 ? 1 : 2),
                y: (y - y % 1) * 2 + (y % 1 < 0.75 ? 1 : 2)
            };
        },
        /**
         * Save the current board state to localStorage.
         * @returns {true}
         */
        save(): true {
            localStorage.setItem('kq_name', board.settings.name!);
            localStorage.setItem('kq_mono', String(board.settings.isMonospaced));
            localStorage.setItem('kq_size', String(board.settings.size));
            localStorage.setItem('kq_data', board.svg.innerHTML);
            board.settings.notify('info', 'تم الحفظ في ذاكرة التطبيق');
            return true;
        },
        /**
         * Undo the last drawing action.
         */
        undo() {
            if (board.settings.lastSavedBoard !== 'default') board.svg.innerHTML = board.settings.lastSavedBoard;
            else board.settings.notify('info', 'لم ترسم شيئاً بعد');
            board.settings.notify('info', 'تذكر أن التراجع مرة واحدة');
            board.drawingTools.resets();
        },
        /**
         * Backup the current SVG innerHTML.
         * @returns {true}
         */
        backup(): true {
            board.settings.lastSavedBoard = board.svg.innerHTML;
            return true;
        },
        /**
         * Export the board as SVG, PNG, or PDF.
         * @param {string} type - Export type ('svg', 'png', 'pdf')
         * @returns {Promise<true>}
         */
        async export(type: string): Promise<true> {
            switch (type) {
                case 'pdf': {
                    let pdf = window.open('');
                    let bbox = (board.svg as SVGGraphicsElement).getBBox();
                    let viewBox = [bbox.x, bbox.y, bbox.width, bbox.height].join(' ');
                    pdf!.document.write(`<html><head><title>${board.settings.name}</title>`);
                    pdf!.document.write('</head><body>');
                    pdf!.document.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${board.svg.style.width}" height="${board.svg.style.height}" viewBox="${viewBox}">${board.svg.innerHTML}</svg>`);
                    pdf!.document.write('<style>svg{width:360px;height: 360px;}</style>');
                    pdf!.document.write('</body></html>');
                    pdf!.document.close();
                    pdf!.print();
                    pdf!.onfocus = () => {
                        setTimeout(() => {
                            pdf!.close();
                        }, 500);
                    };
                    board.settings.notify('info', 'قد لا يعمل التصدير إلى PDF في بعض الأجهزة');
                    break;
                }
                case 'png': {
                    let $a = document.createElement('a');
                    const imgUrl = await convertSVGtoImg();
                    if (!imgUrl) {
                        board.settings.notify('warn', 'تعذر تحويل SVG إلى صورة');
                        break;
                    }
                    $a.href = imgUrl;
                    $a.setAttribute('download', (board.settings.name ?? 'kufi').replace(/\s/g, '-') + '.png');
                    $a.click();
                    board.settings.notify();
                    break;
                }
                default: {
                    let $a = document.createElement('a');
                    let bbox = (board.svg as SVGGraphicsElement).getBBox();
                    $a.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="${bbox.x},${bbox.y},${bbox.width},${bbox.height}">${board.svg.innerHTML}</svg>`));
                    $a.setAttribute('download', (board.settings.name ?? 'kufi').replace(/\s/g, '-') + '.svg');
                    $a.click();
                    board.settings.notify();
                }
            }
            return true;
        },
        /**
         * Draw items on the workspace.
         * @param {BoardItem|BoardItem[]} items - Item(s) to draw
         * @param {boolean} [dummy=false] - If true, draw as dummy/preview
         * @returns {SVGPathElement|SVGPathElement[]|undefined}
         */
        draw(items: BoardItem | BoardItem[], dummy: boolean = false): SVGPathElement | SVGPathElement[] | undefined {
            $$('.dummy').forEach(el => el.remove());
            let elements: SVGPathElement[] = [];
            if (!Array.isArray(items)) items = [items];
            for (let item of items) {
                let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                let d = '';
                switch (item.type) {
                    case 'shape':
                        let data = board.data as ShapeItem[]
                        if (dummy || data.map(i => i.point).flat().filter(point => board.drawingTools.isSamePoint(point, item.point)).length === 0) {
                            d = board.drawingTools.getPathForShape(item)
                            if (!d) return
                            path.setAttribute('d', d)
                            path.setAttribute('fill', item.fill)
                            path.dataset.shape = item.shape
                        } else if (data.map(i => i.point).filter(point => board.drawingTools.isSamePoint(point, item.point)).length > 0) {
                            let shape = data.filter(({ point }) => board.drawingTools.isSamePoint(point, item.point))[0]
                            let index = data.indexOf(shape)
                            let element = $(`[data-index='${index}']`) as SVGPathElement | null
                            if (!element) return;
                            d = board.drawingTools.getPathForShape(item)
                            if (!d) return
                            (element as SVGPathElement).setAttribute('d', d);
                            (element as SVGPathElement).setAttribute('fill', item.fill);
                            (element as SVGPathElement).dataset.shape = item.shape
                            data[index].shape = item.shape
                            data[index].fill = item.fill
                            return
                        }
                        break
                    case 'arch':
                        let [point1, point2] = [item.start, item.end]
                        let radius = board.drawingTools.radius([point1, point2])
                        let dir = item.dir
                        let { x: x1, y: y1, width, height } = board.drawingTools.rectFromPoint(point1)
                        let { x: x2, y: y2 } = board.drawingTools.rectFromPoint(point2)
                        path.setAttribute('stroke-width', '' + width)
                        path.setAttribute('stroke', item.stroke)
                        path.setAttribute('fill', 'transparent')
                        if (x2 > x1 && y1 === y2) {
                            path.setAttribute('d', `M ${x1 + 0.5 * width},${y1 + (dir ? height : 0)} A ${radius},${radius} 0 0 ${dir} ${x2 + 0.5 * width},${y2 + (dir ? height : 0)}`)
                        } else if (x2 < x1 && y1 === y2) {
                            path.setAttribute('d', `M ${x1 + 0.5 * width},${y1 + (dir ? 0 : height)} A ${radius},${radius} 0 0 ${dir} ${x2 + 0.5 * width},${y2 + (dir ? 0 : height)}`)
                        } else if (x1 === x2 && y2 > y1) {
                            path.setAttribute('d', `M ${x1 + (dir ? 0 : width)},${y1 + 0.5 * height} A ${radius},${radius} 0 0 ${dir} ${x2 + (dir ? 0 : width)},${y2 + 0.5 * height}`)
                        } else if (x1 === x2 && y2 < y1) {
                            path.setAttribute('d', `M ${x1 + (dir ? width : 0)},${y1 + 0.5 * height} A ${radius},${radius} 0 0 ${dir} ${x2 + (dir ? width : 0)},${y2 + 0.5 * height}`)
                        } else if (x2 > x1 && y2 > y1) {
                            path.setAttribute('d', `M ${x1 + (dir ? 0 : 0.5 * width)},${y1 + (dir ? 0.5 * height : 0)} A ${radius},${radius} 0 0 ${dir} ${x2 + (dir ? 0.5 * width : width)},${y2 + (dir ? height : 0.5 * height)}`)
                        } else if (x2 > x1 && y2 < y1) {
                            path.setAttribute('d', `M ${x1 + (dir ? 0.5 * width : 0)},${y1 + (dir ? height : 0.5 * height)} A ${radius},${radius} 0 0 ${dir} ${x2 + (dir ? width : 0.5 * width)},${y2 + (dir ? 0.5 * height : 0)}`)
                        } else if (x2 < x1 && y2 > y1) {
                            path.setAttribute('d', `M ${x1 + (dir ? 0.5 * width : width)},${y1 + (dir ? 0 : 0.5 * height)} A ${radius},${radius} 0 0 ${dir} ${x2 + (dir ? 0 : 0.5 * width)},${y2 + (dir ? 0.5 * height : height)}`)
                        } else {
                            path.setAttribute('d', `M ${x1 + (dir ? width : 0.5 * width)},${y1 + (dir ? 0.5 * height : height)} A ${radius},${radius} 0 0 ${dir} ${x2 + (dir ? 0.5 * width : 0)},${y2 + (dir ? 0 : 0.5 * height)}`)
                        }
                        break
                    case 'line':
                        for (let [index, point] of item.points.entries()) {
                            let { x, y, width, height } = board.drawingTools.rectFromPoint(point)
                            let z = board.drawingTools.isSamePoint(item.points[0], item.points[item.points.length - 1])
                            if (index === 0 || index === item.points.length - 1) {
                                let { x: x1, y: y1 } = board.drawingTools.rectFromPoint(item.points[index === 0 ? index : index - 1])
                                let { x: x2, y: y2 } = board.drawingTools.rectFromPoint(item.points[index === 0 ? index + 1 : index])
                                let dx = x2 - x1
                                let dy = y2 - y1
                                if (dx && !dy && !z) {
                                    if (dx > 0) {
                                        x -= (index === 0 ? +1 : -1) * 0.5 * width
                                    } else {
                                        x += (index === 0 ? +1 : -1) * 0.5 * width
                                    }
                                }
                                if (dy && !dx && !z) {
                                    if (dy > 0) {
                                        y -= (index === 0 ? +1 : -1) * 0.5 * height
                                    } else {
                                        y += (index === 0 ? +1 : -1) * 0.5 * height
                                    }
                                }
                                d += (index === item.points.length - 1 && z ? 'Z' : `${index === 0 ? 'M' : 'L'} ${x + 0.5 * width},${y + 0.5 * height}`)
                            } else {
                                d += ` L ${x + 0.5 * width},${y + 0.5 * height} `
                            }
                        }
                        path.setAttribute('d', d)
                        path.setAttribute('stroke', item.stroke)
                        path.setAttribute('stroke-width', '' + (board.settings.isMonospaced ? 1 : 0.75))
                        path.setAttribute('fill', 'transparent')
                        break
                }
                if (dummy) path.classList.add('dummy');
                board.workspace.appendChild(path);
                elements.push(path);
            }
            return elements.length === 1 ? elements[0] : elements;
        },
        /**
         * Create a shape item.
         * @param {Point} point - Point object
         * @param {boolean} [isRect=false] - If true, force square
         * @returns {ShapeItem}
         */
        shape(point: Point, isRect: boolean = false): ShapeItem {
            return {
                type: 'shape',
                point: point,
                fill: board.settings.color,
                shape: isRect ? 'square' : board.settings.drawingShape
            };
        },
        /**
         * Get SVG path for a shape item.
         * @param {ShapeItem} item
         * @returns {string}
         */
        getPathForShape(item: ShapeItem): string {
            let { x, y, width, height } = board.drawingTools.rectFromPoint(item.point);
            let d = '';
            switch (item.shape) {
                case 'circle':
                    // ... circle logic ...
                    break;
                default:
                    d = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`;
                    break;
            }
            return d;
        },
        /**
         * Create an arch item between two points.
         * @param {Point} point1
         * @param {Point} point2
         * @returns {ArchItem}
         */
        arch(point1: Point, point2: Point): ArchItem {
            return {
                type: 'arch',
                start: point1,
                end: point2,
                dir: board.settings.archDir,
                stroke: board.settings.color
            };
        },
        /**
         * Calculate the radius for an arch.
         * @param {[Point, Point]} points - Array of two points
         * @returns {number}
         */
        radius([point1, point2]: [Point, Point]): number {
            let radius = 0;
            let [rect1, rect2] = [board.drawingTools.rectFromPoint(point1), board.drawingTools.rectFromPoint(point2)];
            let [x1, y1, x2, y2] = [rect1.x, rect1.y, rect2.x, rect2.y];
            let dx = Math.abs(x2 - x1);
            let dy = Math.abs(y2 - y1);
            if (dy === dx && dx !== 0) radius = dx + (board.settings.isMonospaced ? 0.5 : 0.375);
            if (!((dy && dx) && (dy || dx))) radius = (dy || dx) / 2;
            return radius;
        },
        /**
         * Create a line or shape from points.
         * @param {Point[]} points
         * @returns {LineItem|ShapeItem|ShapeItem[]}
         */
        line(points: Point[]): LineItem | ShapeItem | ShapeItem[] {
            if (points.length < 2) return {
                type: 'shape',
                point: points[0],
                fill: board.settings.color,
                shape: 'square'
            };
            else if (points.length === 2 && (points[0].x === points[1].x || points[0].y === points[1].y)) {
                let dx = points[1].x - points[0].x;
                let dy = points[1].y - points[0].y;
                let m = Math.abs(dx || dy) + 1;
                let n = m;
                let rects: ShapeItem[] = [];
                let point = dx ? (dx > 0 ? points[0] : points[1]) : (dy > 0 ? points[0] : points[1]);
                while (n > 0) {
                    if (dx) rects.push({
                        type: 'shape',
                        point: { x: point.x + m - n, y: point.y },
                        fill: board.settings.color,
                        shape: 'square'
                    });
                    else rects.push({
                        type: 'shape',
                        point: { x: point.x, y: point.y + m - n },
                        fill: board.settings.color,
                        shape: 'square'
                    });
                    n--;
                }
                return rects;
            } else return {
                type: 'line',
                points: points,
                stroke: board.settings.color
            };
        },
        /**
         * Push items to the board and draw them.
         * @param {BoardItem|BoardItem[]} items
         * @returns {BoardItem|BoardItem[]}
         */
        push(items: BoardItem | BoardItem[]): BoardItem | BoardItem[] {
            let elements: BoardItem[] = [];
            if (!Array.isArray(items)) items = [items];
            for (let item of items) {
                let el = board.drawingTools.draw(item);
                if (el && (Array.isArray(el) ? el.length > 0 : true)) {
                    (el as any).dataset.index = board.data.length;
                    board.data.push(item);
                    elements.push(item);
                }
            }
            return elements.length === 1 ? elements[0] : elements;
        },
        /**
         * Get rectangle info from a point.
         * @param {Point} point
         * @returns {{x: number, y: number, width: number, height: number}}
         */
        rectFromPoint({ x, y }: Point): { x: number; y: number; width: number; height: number; } {
            return board.settings.isMonospaced ? {
                x: x - 1,
                y: y - 1,
                width: 1,
                height: 1
            } : {
                x: (x % 2 === 0 ? x - 2 : x - 1) / 2 + (x % 2 === 0 ? 0.75 : 0),
                y: (y % 2 === 0 ? y - 2 : y - 1) / 2 + (y % 2 === 0 ? 0.75 : 0),
                width: x % 2 === 1 ? 0.75 : 0.25,
                height: y % 2 === 1 ? 0.75 : 0.25
            };
        },
        /**
         * Check if a point is a main rectangle.
         * @param {Point} point
         * @returns {boolean}
         */
        isMainRect(point: Point): boolean {
            let rect = board.drawingTools.rectFromPoint(point);
            return rect.width === rect.height && rect.width !== 0.25;
        },
        /**
         * Check if two points are the same.
         * @param {Point} point1
         * @param {Point} point2
         * @returns {boolean}
         */
        isSamePoint(point1: Point, point2: Point): boolean {
            return point1.x === point2.x && point1.y === point2.y;
        },
        /**
         * Change the color of an SVG element.
         * @param {SVGElement} el
         * @returns {true}
         */
        changeColor(el: SVGElement): true {
            el.setAttribute('fill', board.settings.color);
            return true;
        },
        /**
         * Remove hidden elements (for eraser tool).
         * @returns {true}
         */
        removeHidden(): true {
            if (board.settings.toBeRemovedElements.length > 0) board.drawingTools.backup();
            board.settings.toBeRemovedElements.forEach(el => el.remove());
            board.settings.notify();
            return true;
        },
        /**
         * Hide an SVG element (for eraser tool).
         * @param {SVGElement} el
         * @returns {true}
         */
        hide(el: SVGElement): true {
            if (el.getAttribute('stroke'))
                el.setAttribute('style', 'stroke:lightpink');
            else
                el.setAttribute('style', 'fill:lightpink');
            board.settings.toBeRemovedElements.push(el);
            return true;
        },
        /**
         * Reset dummy/preview elements and tool state.
         * @param {boolean} [empty=true]
         * @returns {true}
         */
        resets(empty: boolean = true): true {
            document.querySelectorAll('svg *[style]').forEach(el => {
                (el as SVGElement).style.fill == 'tomato' ? el.remove() : el.removeAttribute('style');
            });
            (board as any)._archs = [];
            if (empty) (board.drawingTools as any).lines = [];
            return true;
        },
    } as DrawingTools,
    /**
     * Initialize the board workspace and event listeners.
     * @param {string} name - Board name
     * @param {boolean} isMonospaced - Use monospaced grid
     * @param {boolean} [restoreFromLocalStorage=false] - Restore from localStorage
     */
    init(name: string, isMonospaced: boolean, restoreFromLocalStorage: boolean = false) {
        board.settings.name = (restoreFromLocalStorage ? localStorage.getItem('kq_name') ?? '' : (name ? name.replace(/[/\\?%*:|"<>،]/g, ' ').replace(/\s\s+/g, ' ').trim() : ''))
        board.settings.isMonospaced = restoreFromLocalStorage ? localStorage.getItem('kq_mono') === 'true' : !!isMonospaced
        board.settings.size = restoreFromLocalStorage ? +(localStorage.getItem('kq_size') ?? 3200) : 3200
        if (restoreFromLocalStorage) board.svg.innerHTML = localStorage.getItem('kq_data') ?? ''
        board.svg.style.setProperty('--size', board.settings.size + 'px')
        document.title = `KufiCraft - ${board.settings.name}`
        const container = $('#container') as HTMLElement | null;
        if (container) container.classList.remove('hidden')
        const createEl = $('#create') as HTMLElement | null;
        if (createEl) createEl.classList.add('hidden')
        const popup = $('#popup') as HTMLElement | null;
        if (popup) {
            popup.onclick = (e: MouseEvent) => {
                e.stopPropagation()
                if ((e.target as HTMLElement).id === 'popup') (e.target as HTMLElement).classList.add('hidden')
            }
        }
        if (container) {
            container.scrollTo({
                top: 1600 - innerHeight / 2,
                left: innerWidth / 2 - 1600
            })
        }
        if (board.settings.isMonospaced) board.svg.classList.add('mono')
        board.svg.querySelectorAll('g').forEach(el => el.remove())
        board.svg.appendChild(board.workspace)
        const toolbar = $('#toolbar') as HTMLElement | null;
        if (toolbar) toolbar.classList.remove('hidden')

        board.svg.addEventListener('touchstart', e => {
            board.settings.toBeRemovedElements = []
            if (board.settings.tool == 'pen') board.drawingTools.backup()
            board.settings.isPainting = true
        }, { passive: true })

        board.svg.addEventListener('mousedown', e => {
            e.preventDefault()

            let el = document.elementFromPoint(e.clientX, e.clientY) as Element | null
            if (!el) return;
            let pt = new DOMPoint(e.clientX, e.clientY);
            let ctm = (board.svg as SVGGraphicsElement).getScreenCTM();
            if (!ctm) return;
            let { x: x, y: y } = pt.matrixTransform(ctm.inverse())

            board.settings.toBeRemovedElements = []
            if (!board.settings.isPainting) {
                if (board.settings.tool == 'pen') {
                    board.drawingTools.push(board.drawingTools.shape(board.drawingTools.point(x, y)))
                }

                if (el.closest('#kufi') && el.id != 'kufi' && board.settings.tool == 'eraser') {
                    if (el instanceof SVGElement) board.drawingTools.hide(el)
                }

                if (board.settings.tool == 'line') {
                    if (board.drawingTools.isMainRect(board.drawingTools.point(x, y))) {
                        if (board.settings.linePoints.length > 1
                            && (board.drawingTools.isSamePoint(board.settings.linePoints[0], board.drawingTools.point(x, y))
                                || board.drawingTools.isSamePoint(board.drawingTools.point(x, y), board.settings.linePoints[board.settings.linePoints.length - 1]))) {
                            if (board.drawingTools.isSamePoint(board.settings.linePoints[0], board.drawingTools.point(x, y)))
                                board.settings.linePoints.push(board.drawingTools.point(x, y))

                            board.drawingTools.push(board.drawingTools.line(board.settings.linePoints))
                            board.settings.linePoints = []
                        } else {
                            board.settings.linePoints.push(board.drawingTools.point(x, y))
                            board.drawingTools.draw(board.drawingTools.line(board.settings.linePoints), true)
                        }
                    }
                }
                if (board.settings.tool == 'arch') {
                    if (!board.settings.dummy.type) {
                        let rect = board.drawingTools.rectFromPoint(board.drawingTools.point(x, y))
                        if (board.drawingTools.isMainRect(board.drawingTools.point(x, y))) {
                            const shapeRect = board.drawingTools.shape(board.drawingTools.point(x, y), true)
                            board.settings.dummy = shapeRect
                            board.drawingTools.draw(shapeRect, true)
                        }
                    }
                }
                if (board.settings.tool == 'hand') {
                    if (container) {
                        board.settings.scrolling.is = true
                        const htmlContainer = container as HTMLElement;
                        board.settings.scrolling.startX = e.pageX - htmlContainer.offsetLeft;
                        board.settings.scrolling.scrollLeft = htmlContainer.scrollLeft ?? 0
                        board.settings.scrolling.startY = e.pageY - htmlContainer.offsetTop;
                        board.settings.scrolling.scrollTop = htmlContainer.scrollTop ?? 0
                    }
                }
            }
            board.settings.isPainting = true
        })

        board.svg.addEventListener('touchmove', e => {
            let el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) as Element | null
            if (!el) return;
            let pt = new DOMPoint(e.touches[0].clientX, e.touches[0].clientY);
            let ctm = (board.svg as SVGGraphicsElement).getScreenCTM();
            if (!ctm) return;
            let { x: x, y: y } = pt.matrixTransform(ctm.inverse())
            if (el.id == 'kufi' && board.settings.tool == 'pen') board.drawingTools.push(board.drawingTools.shape(board.drawingTools.point(x, y)))
            if (el.parentElement?.id == 'kufi' && board.settings.tool == 'pen' && el instanceof SVGElement) board.drawingTools.changeColor(el)
            if (el.parentElement?.id == 'kufi' && board.settings.tool == 'eraser' && el instanceof SVGElement) board.drawingTools.hide(el)
        }, { passive: true })

        board.svg.addEventListener('mousemove', e => {
            e.preventDefault()

            let el = document.elementFromPoint(e.clientX, e.clientY) as Element | null
            let pt = new DOMPoint(e.clientX, e.clientY);
            let ctm = (board.svg as SVGGraphicsElement).getScreenCTM();
            if (!ctm) return;
            let { x: x, y: y } = pt.matrixTransform(ctm.inverse())

            if (board.settings.scrolling.is) {
                const htmlContainer = container as HTMLElement;
                const x = e.pageX - htmlContainer.offsetLeft;
                const walkX = (x - board.settings.scrolling.startX);
                htmlContainer.scrollLeft = (board.settings.scrolling.scrollLeft ?? 0) - walkX;
                const y = e.pageY - htmlContainer.offsetTop;
                const walkY = (y - board.settings.scrolling.startY);
                htmlContainer.scrollTop = (board.settings.scrolling.scrollTop ?? 0) - walkY;
            } else if (board.settings.isPainting && el) {
                if (board.settings.tool == 'pen') board.drawingTools.push(board.drawingTools.shape(board.drawingTools.point(x, y)))
                if (el.closest('#kufi') && el.id != 'kufi' && board.settings.tool == 'eraser' && el instanceof SVGElement) board.drawingTools.hide(el)
            }
            if (board.settings.tool == 'arch' && board.settings.dummy.type && board.drawingTools.isMainRect(board.drawingTools.point(x, y)) && !board.drawingTools.isSamePoint(board.drawingTools.point(x, y), board.settings.dummy.point || board.settings.dummy.points[1])) {
                if (board.settings.dummy.type != 'arch') {
                    board.settings.dummy = board.drawingTools.arch(board.drawingTools.point(x, y), board.settings.dummy.point)
                } else if (board.drawingTools.radius([board.drawingTools.point(x, y), board.settings.dummy.points[1]])) {
                    board.settings.dummy = board.drawingTools.arch(board.drawingTools.point(x, y), board.settings.dummy.points[1])
                }
                if (board.settings.dummy.points && board.drawingTools.radius(board.settings.dummy.points)) {
                    board.drawingTools.draw(board.settings.dummy, true)
                }
            }
            if (board.settings.tool == 'line' && board.settings.linePoints.length > 0 && board.drawingTools.isMainRect(board.drawingTools.point(x, y))) {
                if (board.drawingTools.isSamePoint(board.settings.linePoints[board.settings.linePoints.length - 1], board.drawingTools.point(x, y)))
                    board.drawingTools.draw(board.drawingTools.line(board.settings.linePoints), true)
                else
                    board.drawingTools.draw(board.drawingTools.line([...board.settings.linePoints, board.drawingTools.point(x, y)]), true)
            }
        })

        board.svg.addEventListener('touchend', e => {
            board.settings.isPainting = false
            if (board.settings.tool == 'eraser') board.drawingTools.removeHidden()
        }, { passive: true })

        board.svg.addEventListener('mouseup', e => {
            e.preventDefault()
            let el = document.elementFromPoint(e.clientX, e.clientY) as Element | null
            let pt = new DOMPoint(e.clientX, e.clientY);
            let ctm = (board.svg as SVGGraphicsElement).getScreenCTM();
            if (!ctm) return;
            let { x: x, y: y } = pt.matrixTransform(ctm.inverse())
            board.settings.isPainting = false
            if (board.settings.tool == 'eraser') board.drawingTools.removeHidden()
            if (board.settings.tool == 'arch' && board.settings.dummy.type == 'arch') {
                board.drawingTools.push(board.settings.dummy)
                $$('.dummy').forEach(el => el?.remove())
                board.settings.dummy = {}
                board.settings.notify()
            } else if (board.settings.tool == 'arch' && board.settings.dummy.type && board.drawingTools.isMainRect(board.drawingTools.point(x, y)) && !board.drawingTools.isSamePoint(board.drawingTools.point(x, y), board.settings.dummy.point || board.settings.dummy.points[1])) {
                if (board.settings.dummy.type != 'arch') {
                    board.settings.dummy = board.drawingTools.arch(board.drawingTools.point(x, y), board.settings.dummy.point)
                } else if (board.drawingTools.radius([board.drawingTools.point(x, y), board.settings.dummy.points[1]])) {
                    board.settings.dummy = board.drawingTools.arch(board.drawingTools.point(x, y), board.settings.dummy.points[1])
                }
                if (board.settings.dummy.points && board.drawingTools.radius(board.settings.dummy.points)) {
                    board.drawingTools.draw(board.settings.dummy, true)
                }
            }
            board.settings.scrolling.is = false
        })

        window.addEventListener("keydown", e => {
            if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                $('#popup')?.classList.remove('hidden')
            }
            if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                board.drawingTools.undo()
            }
            if (e.key === 'h') { board.settings.tool = 'hand'; e.preventDefault() }
            if (e.key === 'p') { board.settings.tool = 'pen'; e.preventDefault() }
            if (e.key === 'e') { board.settings.tool = 'eraser'; e.preventDefault() }
            if (e.key === 'l') { board.settings.tool = 'line'; e.preventDefault() }
            if (e.key === 'c') { board.settings.tool = 'arch'; board.settings.archDir = 1; const overclockwise = $('#overclockwise') as HTMLInputElement | null; if (overclockwise) overclockwise.checked = true; e.preventDefault() }
        });

    }
};


const create = (restoreFromLocalStorage = false) => {
    let name = ($('#name') as HTMLInputElement | null)?.value ?? ''
    let isMonospaced = ($('#mono') as HTMLInputElement | null)?.checked ?? false
    board.init(name, isMonospaced, restoreFromLocalStorage)
    //window.onerror = err => board.settings.notify('warn', err)
    if (restoreFromLocalStorage) {
        board.settings.notify('info', 'تم استعادة اللوحة من ذاكرة التطبيق')
        board.settings.snap()
    }
}

onload = () => {
    $('.loader')?.remove()
    $('#create button[disabled]')?.removeAttribute('disabled')
    if (localStorage.getItem('kq_name') && localStorage.getItem('kq_mono') && localStorage.getItem('kq_data')) {
        $('#restore')?.removeAttribute('hidden')
        if (location.hash === '#restore') create(true)
    }
}

const loadImage = async (url: string) => {
    const $img = document.createElement('img')
    $img.src = url
    return new Promise((resolve, reject) => {
        $img.onload = () => resolve($img)
        $img.onerror = reject
    })
}

const convertSVGtoImg = async () => {
    const $svg = board.svg as SVGGraphicsElement
    const format = 'png'
    const bbox = $svg.getBBox()

    const svgAsXML = (new XMLSerializer()).serializeToString($svg)
    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`

    const img = await loadImage(svgData) as HTMLImageElement

    let $canvas = document.createElement('canvas')
    $canvas.width = $svg.clientWidth
    $canvas.height = $svg.clientHeight
    let ctx = $canvas.getContext('2d')
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, $svg.clientWidth, $svg.clientHeight)
    let imageData = ctx.getImageData(bbox.x * $svg.clientWidth / 100, bbox.y * $svg.clientHeight / 100, bbox.width * $svg.clientWidth / 100, bbox.height * $svg.clientHeight / 100)
    $canvas = document.createElement('canvas')
    $canvas.width = bbox.width * $svg.clientWidth / 100
    $canvas.height = bbox.height * $svg.clientHeight / 100
    ctx = $canvas.getContext("2d")
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0)

    const dataURL = await $canvas.toDataURL(`image/${format}`, 1.0)

    return dataURL
}

// FIXME: to be removed
board.init('', false, false)
//@ts-ignore
window.board = board