const $ = document.querySelector.bind(document)

type Tool = "hand" | "eraser" | "pen" | "line" | "arch" | "arch2"

export class Kufi {

  isPainting = false
  scrolling = {
    is: false,
    startX: 0,
    scrollLeft: 0,
    startY: 0,
    scrollTop: 0
  }
  svg: SVGSVGElement
  tool: string = "pen"
  color: string = "black"
  old: string = "default"
  rect: number = 10
  gridType: string = "square"
  hidden: SVGElement[] = []
  archs: SVGElement[] = []
  lines: { x?: number; y?: number; el?: SVGElement; innerRadius?: number; outerRadius?: number; startAngle?: number; endAngle?: number; }[] = []
  name: string
  mono: boolean
  size: number

  constructor(name: string, mono: boolean, restore: boolean = false, gridType: string = "square") {
    this.svg = $("#kufi") as SVGSVGElement

    this.name = restore ? localStorage.getItem("kq_name")! : name.replace(/\s\s+/g, " ").trim()
    this.mono = restore ? localStorage.getItem("kq_mono") === "true" : mono
    this.size = restore ? parseInt(localStorage.getItem("kq_size")!) : 3200
    if (restore) this.svg.innerHTML = localStorage.getItem("kq_data")!
    this.svg.style.setProperty("--size", this.size + "px")
    document.title = document.title + ` - ${this.name}`;
    ($("#container") as HTMLElement).style.display = "block";
    ($("#create") as HTMLElement).style.display = "none";
    ($("#popup") as HTMLElement).onclick = (e: MouseEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).id === "popup" && this.popup(false)
    }
    ($("#container") as HTMLElement).scrollTo({
      top: 2000 - innerHeight / 2,
      left: innerWidth / 2 - 2000
    })

    this.svg.classList.remove("mono", "square", "circular");

    this.gridType = gridType;
    this.svg.classList.add(this.gridType);
    this.mono && this.svg.classList.add("mono");

    ($("#toolbar") as HTMLElement).style.display = "grid"

    let el: SVGElement | null

    this.svg.addEventListener("touchstart", (e: TouchEvent) => {
      this.hidden = []
      if (this.tool == "pen") this.backup()
      this.paint(true)
    }, { passive: true })

    this.svg.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault()
      if (!this.isPainting) {
        el = document.elementFromPoint(e.clientX, e.clientY) as SVGElement

        if (el.parentElement?.id == "kufi") {
          this.hide(el)
          this.removeHidden()
        }
      }
    })

    this.svg.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault()
      if ((window as any).installer) {
        (window as any).installer.prompt()
          (window as any).installer = 0
      }
      this.hidden = []
      if (!this.isPainting) {
        let pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        let svgP = pt.matrixTransform(this.svg.getScreenCTM()!.inverse());

        el = document.elementFromPoint(e.clientX, e.clientY) as SVGElement
        let x = svgP.x;
        let y = svgP.y;

        if (el.id == "kufi" && this.tool == "pen") {
          this.backup()
          this.drawRect(x, y)
        }
        if (el.parentElement?.id == "kufi" && this.tool == "pen") {
          this.backup()
          this.changeColor(el)
        }
        if (el.parentElement?.id == "kufi" && this.tool == "eraser") {
          this.hide(el)
        }

        if (this.tool == "line") {

          if (el.tagName.toLowerCase() === (this.gridType === "square" ? "rect" : "path")) {
            if (this.gridType === "square") {
              this.lines.push({ x: +el.getAttribute("x")!, y: +el.getAttribute("y")! })
            } else {
              const { innerRadius, outerRadius, startAngle, endAngle } = el.dataset;
              this.lines.push({ el, innerRadius: +innerRadius!, outerRadius: +outerRadius!, startAngle: +startAngle!, endAngle: +endAngle! });
            }
            el.style.fill = "tomato"
            if (this.lines.length === 2) {
              this.resets(false)
              this.backup()
              this.line()
            }
          } else if (el.id == "kufi") {
            let temp = this.getCoor(x, y);
            if (this.gridType === "square") {
              if ((temp.height == this.rect || temp.height == this.rect / 4 * 3) && (temp.width == this.rect || temp.width == this.rect / 4 * 3)) {
                this.drawRect(x, y).setAttribute("style", "fill:tomato")
                this.lines.push({ x: temp.x, y: temp.y })
                if (this.lines.length === 2) {
                  this.resets(false)
                  this.backup()
                  this.line()
                }
              }
            } else {
              let newEl = this.drawRect(x, y);
              (newEl as SVGElement).setAttribute("style", "fill:tomato");
              this.lines.push({ el: newEl, innerRadius: temp.innerRadius, outerRadius: temp.outerRadius, startAngle: temp.startAngle, endAngle: temp.endAngle });
              if (this.lines.length === 2) {
                this.resets(false);
                this.backup();
                this.line();
              }
            }
          }
        }
        if (this.tool.includes("arch")) {
          if (el.tagName.toLowerCase() === (this.gridType === "square" ? "rect" : "path")) {
            this.backup()
            if (this.archs.length < 1) {
              this.archs.push(el)
              el.setAttribute("style", "fill:mediumspringgreen")
              this.info(this.gridType === "square" ? "اختر مربعًا آخر من الصف نفسه" : "اختر قطعة دائرية أخرى");
            } else if (this.gridType === "square" && el.getAttribute("y") === this.archs[0].getAttribute("y")) {
              this.archs.push(el)
              this.archs[0].removeAttribute("style")
              this.arch(this.archs[0], this.archs[1], this.tool === "arch2")
              this.archs = []
            } else if (this.gridType === "circular" && this.archs.length === 1) {
              this.archs.push(el);
              this.archs[0].removeAttribute("style");
              this.arch(this.archs[0], this.archs[1], this.tool === "arch2");
              this.archs = [];
            } else {
              this.info(this.gridType === "square" ? "رجاءً اختر مربعًا على نفس المحور الأفقي" : "يُحمل القوس على قطعتين دائريتين حصرًا");
            }
          }
        }
        if (this.tool == "hand") {
          this.scrolling.is = true
          this.scrolling.startX = e.pageX - ($("#container") as HTMLElement).offsetLeft;
          this.scrolling.scrollLeft = ($("#container") as HTMLElement).scrollLeft
          this.scrolling.startY = e.pageY - ($("#container") as HTMLElement).offsetTop;
          this.scrolling.scrollTop = ($("#container") as HTMLElement).scrollTop
        }
      }
      this.paint(true)
    })

    this.svg.addEventListener("touchmove", (e: TouchEvent) => {
      let pt = this.svg.createSVGPoint();
      pt.x = e.touches[0].clientX;
      pt.y = e.touches[0].clientY;
      let svgP = pt.matrixTransform(this.svg.getScreenCTM()!.inverse());

      el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) as SVGElement
      let x = svgP.x;
      let y = svgP.y;

      if (el.id == "kufi" && this.tool == "pen") this.drawRect(x, y)
      if (el.parentElement?.id == "kufi" && this.tool == "pen" && el.tagName.toLowerCase() === (this.gridType === "square" ? "rect" : "path")) this.changeColor(el)
      if (el.parentElement?.id == "kufi" && this.tool == "eraser" && el.tagName.toLowerCase() === (this.gridType === "square" ? "rect" : "path")) this.hide(el)
    }, { passive: true })

    this.svg.addEventListener("mousemove", (e: MouseEvent) => {
      e.preventDefault()
      if (this.scrolling.is) {
        const x = e.pageX - ($("#container") as HTMLElement).offsetLeft;
        const walkX = (x - this.scrolling.startX);
        ($("#container") as HTMLElement).scrollLeft = this.scrolling.scrollLeft - walkX;
        const y = e.pageY - ($("#container") as HTMLElement).offsetTop;
        const walkY = (y - this.scrolling.startY);
        ($("#container") as HTMLElement).scrollTop = this.scrolling.scrollTop - walkY;
      }
      if (this.isPainting) {
        let pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        let svgP = pt.matrixTransform(this.svg.getScreenCTM()!.inverse());

        el = document.elementFromPoint(e.clientX, e.clientY) as SVGElement
        if (el) {
          let x = svgP.x;
          let y = svgP.y;
          if (el.id == "kufi" && this.tool == "pen") this.drawRect(x, y)
          if (el.parentElement?.id == "kufi" && this.tool == "pen" && el.tagName.toLowerCase() === (this.gridType === "square" ? "rect" : "path")) this.changeColor(el)
          if (el.parentElement?.id == "kufi" && this.tool == "eraser" && el.tagName.toLowerCase() === (this.gridType === "square" ? "rect" : "path")) this.hide(el)
        }
      }
    })

    this.svg.addEventListener("touchend", (e: TouchEvent) => {
      this.paint(false)
      if (this.tool == "eraser") this.removeHidden()
    }, { passive: true })

    this.svg.addEventListener("mouseup", (e: MouseEvent) => {
      e.preventDefault()
      this.paint(false)
      if (this.tool == "eraser") this.removeHidden()
      this.scrolling.is = false
    })

    window.addEventListener("keydown", (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case 's': if (e.metaKey || e.ctrlKey) this.popup(true); break;
        case 'z': if (e.metaKey || e.ctrlKey) this.undo(); break;
        case 'h': this.setTool('hand') && e.preventDefault(); break;
        case 'p': this.setTool('pen') && e.preventDefault(); break;
        case 'e': this.setTool('eraser') && e.preventDefault(); break;
        case 'l': this.setTool('line') && e.preventDefault(); break;
        case 'c': this.setTool('arch') && e.preventDefault(); break;
      }
    });
  }

  setTool(tool: Tool): boolean {
    this.tool = tool
    let container = $("#container") as HTMLElement
    this.setInfo(tool)

    if (tool === "hand") container.classList.add("hand")
    else {
      container.classList.remove("hand")
      this.resets(false)
    }

    if (this.gridType == "circular") return true

    if (tool == "line") this.lines = [];

    ($(`[name="tool"]#${tool}`) as HTMLInputElement).checked = true

    return true
  }

  setInfo(tool: Tool) {
    let message = '';
    switch (tool) {
      case 'hand':
        message = "اضغط مرتين على اليد للمحاذاة إلى المنتصف"
        break;

      case "eraser":
        message = "يمكنك الضغط مع السحب لمسح عدة عناصر"
        break;

      case "arch":
      case 'arch2':
        message = this.gridType === "square"
          ? "اضغط على مربعين على نفس المحور الأفقي لرسم قوس بينهما — لا تقم بالضغط على أماكن فارغة"
          : "اضغط على قطعتين دائريتين لرسم قوس بينهما — لا تقم بالضغط على أماكن فارغة";
        break;

      case 'line':
        message = this.gridType === "square"
          ? "حدد نقطتين مختلفتين للوصل بينهما, لا يُستحسن استخدام هذه الأداة لرسم خطوط عمودية أو أفقية إذ لا يمكن رسم قوس عليها كما أنها تعامل كـ كتلة واحدة عند مسحها. تذكر استخدام الضفائر في تصميمك لجعله أكثر جمالية!"
          : "حدد قطعتين دائريتين مختلفتين للوصل بينهما.";
        break;

      case "pen":
        message = Math.round(-Math.random()).toString()
        break;

      default:
        break;
    }

    this.info(message)
  }

  setColor(color: string): boolean {
    this.color = color
    if (!($("#arch") as HTMLInputElement).checked) {
      this.setTool("pen");
      ($("#pen") as HTMLInputElement).checked = true;
    }
    this.info("تم تغيير اللون")
    return true
  }
  snap() {
    let bbox = this.svg.getBBox()
    if (bbox.width)
      ($("#container") as HTMLElement).scrollTo({
        top: (bbox.y + bbox.height / 2) * this.svg.clientHeight / 1000 - innerHeight / 2,
        left: (bbox.x - 1000 + bbox.width / 2) * (this.svg.clientWidth / 1000) + innerWidth / 2
      })
    else
      ($("#container") as HTMLElement).scrollTo({
        top: 2000 - innerHeight / 2,
        left: innerWidth / 2 - 2000
      })
  }
  zoom(dir: number = 1) {
    let pos = [($("#container") as HTMLElement).scrollTop * 1000 / this.svg.clientHeight, ($("#container") as HTMLElement).scrollLeft * 1000 / this.svg.clientWidth]
    let size = this.svg.clientWidth + 400 * dir
    if (size <= 4000 && size >= 800) {
      this.size = size
      this.svg.style.setProperty("--size", size + "px");
      ($("#container") as HTMLElement).scrollTo({
        top: pos[0] * this.svg.clientHeight / 1000,
        left: pos[1] * this.svg.clientWidth / 1000
      })
      this.info("-1")
    } else {
      this.info("عذرًا، يوجد حدود لمعدل التكبير")
    }
  }
  info(text: string | number = ""): boolean {
    if (text === -1) {
      ($("#info") as HTMLElement).textContent = ""
      return true
    }
    let list = [
      "يمكنك دائمًا تغيير لون الكتابة من خلال الضغط على زر الألوان في شريط الأدوات",
      "يمكنك تصدير اللوحة على شكل ملف SVG حيث يمكنك استخدامه في أي برنامج تصميم آخر",
      "تذكر استخدام اختصارات الكيبورد مثل: P لاستخدام القلم، E لاستخدام الممحاة، H لاستخدام اليد، L لرسم خط مستقيم، C لرسم قوس، Ctrl+S للحفظ، Ctrl+Z للتراجع — يمكنك معرفة الاختصار بالوقوف قليلاً فوق الأداة المطلوبة",
      "تم تطوير هذا التطبيق من AbdSattout",
      "يمكنك حفظ اللوحة في التطبيق دون الحاجة لتنزيلها للعودة مرة أخرى واستكمال العمل",
      "نسب الفراغ الافتراضية هي 1:3. يمكنك اختيار الشبكة المنتظمة عند بدء العمل",
      "الخط الكوفي أقدم الخطوط العربية",
      "تذكر أنك تستطيع مسح كل شيء في اللوحة بالضغط مرتين على الممحاة",
      "حافظ على توازن تصميمك، التصميم المتناظر مريح للعين",
      "حاول الالتزام بقواعد الخط الكوفي حتى تكون اللوحة مقروءة",
      "لا تترك فراغات في تصميمك",
      "لا بد من أن يكون التصميم متوازنًا",
      "يمكنك استخدام أداة الخط لرسم خطوط مستقيمة بين نقطتين",
      "يمكنك استخدام أداة القوس لرسم أقواس بين مربعين",
      "يمكنك استخدام أداة اليد لتحريك اللوحة",
      "يمكنك استخدام أداة التكبير والتصغير لتغيير حجم اللوحة",
      "يمكنك استخدام أداة التراجع للتراجع عن آخر إجراء",
      "يمكنك استخدام أداة الحفظ لحفظ اللوحة في التطبيق",
      "يمكنك استخدام أداة التصدير لتصدير اللوحة كملف SVG أو PNG أو PDF",
    ]
    if (typeof text === "number") {
      if (text === -1) {
        ($("#info") as HTMLElement).textContent = ""
      } else {
        ($("#info") as HTMLElement).textContent = list[Math.floor(Math.random() * list.length)]
      }
    } else {
      ($("#info") as HTMLElement).textContent = text
    }
    return true
  }

  backup() {
    this.old = this.svg.innerHTML
  }

  undo() {
    if (this.old == "default") {
      this.info("لا يوجد شيء للتراجع عنه")
      return
    }
    this.svg.innerHTML = this.old
    this.info("تم التراجع")
    this.old = "default"
  }

  paint(bool: boolean) {
    this.isPainting = bool
  }

  changeColor(el: SVGElement) {
    el.setAttribute("fill", this.color)
  }

  hide(el: SVGElement) {
    el.setAttribute("fill", "transparent")
    this.hidden.push(el)
  }

  removeHidden() {
    this.hidden.forEach(el => el.remove())
    this.hidden = []
  }

  resets(bool: boolean = true) {
    this.lines.forEach(line => line.el ? line.el.removeAttribute("style") : null)
    this.lines = []
    this.archs.forEach(el => el.removeAttribute("style"))
    this.archs = []
    if (bool) this.setTool("pen")
  }

  getCoor(x: number, y: number): { x: number; y: number; width: number; height: number; innerRadius?: number; outerRadius?: number; startAngle?: number; endAngle?: number; } {
    if (this.gridType === "square") {
      let rect = this.rect
      let coor = {
        x: Math.round(x / rect) * rect,
        y: Math.round(y / rect) * rect,
        width: rect,
        height: rect
      }
      if (!this.mono) {
        let one = rect / 4
        let three = rect - one
        if (x % rect < three) {
          coor.x = Math.floor(x / rect) * rect
          coor.width = three
        } else {
          coor.x = Math.floor(x / rect) * rect + three
          coor.width = one
        }
        if (y % rect < three) {
          coor.y = Math.floor(y / rect) * rect
          coor.height = three
        } else {
          coor.y = Math.floor(y / rect) * rect + three
          coor.height = one
        }
      }
      return coor
    } else {
      return (window as any).getCircularCoor(this, x, y);
    }
  }

  drawRect(x: number, y: number): SVGRectElement | SVGPathElement {
    if (this.gridType === "square") {
      let coor = this.getCoor(x, y)
      let el = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      el.setAttribute("x", coor.x.toString())
      el.setAttribute("y", coor.y.toString())
      el.setAttribute("width", coor.width.toString())
      el.setAttribute("height", coor.height.toString())
      el.setAttribute("fill", this.color)
      this.svg.appendChild(el)
      return el
    } else {
      return (window as any).drawCircularRect(this, x, y);
    }
  }

  line(): boolean {
    if (this.gridType === "square") {
      if (this.lines.length < 2) {
        this.info("الرجاء تحديد نقطتين لإنشاء خط")
        return false
      }
      let el = document.createElementNS("http://www.w3.org/2000/svg", "line")
      el.setAttribute("x1", this.lines[0].x!.toString())
      el.setAttribute("y1", this.lines[0].y!.toString())
      el.setAttribute("x2", this.lines[1].x!.toString())
      el.setAttribute("y2", this.lines[1].y!.toString())
      el.setAttribute("stroke", this.color)
      el.setAttribute("stroke-width", (this.rect / 2).toString())
      this.svg.insertBefore(el, this.svg.firstChild)
      this.resets()
      this.info("-1")
      return true
    } else {
      return (window as any).drawCircularLine(this);
    }
  }

  arch(el1: SVGElement, el2: SVGElement, bool: boolean = false) {
     if (this.gridType === 'square') {
      let x1, x2, r
      let y = +el1.getAttribute('y')!
      let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('fill', this.color)

      let search = this.svg.querySelector(`[d='${path.getAttribute('d')}']`)
      this.info(-1)

      if (+el1.getAttribute('x')! < +el2.getAttribute('x')!) {
        x1 = +el1.getAttribute('x')!
        x2 = +el2.getAttribute('x')!
      } else {
        x1 = +el2.getAttribute('x')!
        x2 = +el1.getAttribute('x')!
      }

      if (this.mono && x1 !== x2) {
        r = (x2 - x1 + this.rect) / 2
        path.setAttribute('d', `M ${x1},${bool ? y + this.rect : y} a ${r},${r} 0 1 ${bool ? '0' : '1'} ${r * 2},0 h -${this.rect} a ${r - this.rect},${r - this.rect} 0 1 ${bool ? '1' : '0'} -${r * 2 - this.rect * 2},0 z`)
      } else if (x1 !== x2) {
        r = (x2 - x1 + this.rect / 4 * 3) / 2
        path.setAttribute('d', `M ${x1},${bool ? y + this.rect / 4 * 3 : y} a ${r},${r} 0 1 ${bool ? '0' : '1'} ${r * 2},0 h -${this.rect / 4 * 3} a ${r - this.rect / 4 * 3},${r - this.rect / 4 * 3} 0 1 ${bool ? '1' : '0'} -${r * 2 - this.rect / 4 * 3 * 2},0 z`)
      } else this.info('الرجاء اختيار نقطتين مختلفتين')

      if (search) {
        this.info('يوجد بالفعل قوس بين هذه النقاط')
        search.remove()
      }
      this.svg.appendChild(path)
    } else {
      return (window as any).drawCircularArch(this, el1, el2, bool);
    }
  }

  popup(bool: boolean) {
    ($("#popup") as HTMLElement).style.display = bool ? "flex" : "none"
  }

  export(type: string): boolean {
    let name = this.name
    let data = new XMLSerializer().serializeToString(this.svg)
    let file
    if (type == "svg") {
      file = new File([data], name + ".svg", { type: "image/svg+xml" })
      this.download(file)
    } else if (type == "png") {
      let img = new Image()
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)))
      img.onload = () => {
        let canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        let ctx = canvas.getContext("2d")
        ctx!.drawImage(img, 0, 0)
        canvas.toBlob(blob => {
          file = new File([blob!], name + ".png", { type: "image/png" })
          this.download(file)
        })
      }
    } else if (type == "pdf") {
      let img = new Image()
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)))
      img.onload = () => {
        let canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        let ctx = canvas.getContext("2d")
        ctx!.drawImage(img, 0, 0)
        let pdf = new (window as any).jsPDF("l", "pt", [img.width, img.height])
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, img.width, img.height)
        pdf.save(name + ".pdf")
      }
    }
    return true
  }

  download(file: File) {
    let a = document.createElement("a")
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
  }

  save() {
    this.info("تم الحفظ في التطبيق")
    localStorage.setItem("kq_name", this.name)
    localStorage.setItem("kq_mono", this.mono.toString())
    localStorage.setItem("kq_size", this.size.toString())
    localStorage.setItem("kq_data", this.svg.innerHTML)
  }
}

declare global {
  interface Window {
    board: Kufi;
    create: (restore: boolean) => void;
  }
}

function create(restore: boolean) {
  let name = ($("#name") as HTMLInputElement).value
  let mono = ($("#mono") as HTMLInputElement).checked
  let gridType = ($("[name=gridType]:checked") as HTMLInputElement).value

  if (gridType === 'square') {
    gridType = 'square'
  } else if (gridType === 'circular') {
    gridType = 'circular'
    setTimeout(() => {
      document.getElementById('kufi')!.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
      let disables = ['arch', 'arch2', 'line']
      disables.forEach(el => {
        document.getElementById(el)?.parentElement?.removeAttribute('onclick')
        document.getElementById(el)?.setAttribute('disabled', 'disabled')
      })
    }, 100);
  } else {
    gridType = 'square'
  }

  window.board = new Kufi(name, mono, restore, gridType)
  window.onerror = err => window.board.info(err as string)
  if (restore) {
    window.board.info('تم استعادة اللوحة من ذاكرة التطبيق')
    window.board.snap()
  }
}

window.onload = () => {
  if (localStorage.getItem("kq_name")) {
    ($("#restore") as HTMLElement).hidden = false
  }
  ($("#create button[type=submit]") as HTMLButtonElement).disabled = false
}

window.create = create