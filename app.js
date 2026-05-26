document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Vector Particle Background Canvas
    initParticleBackground();

    // 2. Setup Responsive Theme Controls
    initThemeManager();

    // 3. Setup Interactive Mobile Navigation Drawers
    initMobileNav();

    // 4. Connect Interface with Original Console Interpreter Loop
    initTerminalInterpretor();
});

function initParticleBackground() {
    const canvas = document.getElementById("canvas-bg");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    let points = [];
    const maxPoints = 45;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    class Point {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    for (let i = 0; i < maxPoints; i++) points.push(new Point());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        ctx.strokeStyle = isDark ? "rgba(57, 255, 20, 0.04)" : "rgba(5, 150, 105, 0.05)";
        ctx.fillStyle = isDark ? "rgba(57, 255, 20, 0.3)" : "rgba(5, 150, 105, 0.3)";

        points.forEach(p => {
            p.update();
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}

function initThemeManager() {
    const toggleBtn = document.getElementById("theme-toggle");
    if (!toggleBtn) return;

    const savedTheme = localStorage.getItem("portfolio-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    toggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("portfolio-theme", newTheme);
    });
}

function initMobileNav() {
    const openBtn = document.getElementById("mobile-menu-btn");
    const closeBtn = document.getElementById("mobile-close-btn");
    const navOverlay = document.getElementById("mobile-nav");
    const links = document.querySelectorAll(".mobile-link");

    if (!openBtn || !navOverlay) return;

    openBtn.addEventListener("click", () => navOverlay.style.display = "flex");
    const close = () => navOverlay.style.display = "none";
    
    if (closeBtn) closeBtn.addEventListener("click", close);
    links.forEach(l => l.addEventListener("click", close));
}

function initTerminalInterpretor() {
    const input = document.getElementById("terminalInput");
    const body = document.getElementById("terminal-body");
    const quickBtns = document.querySelectorAll(".quick-cmd-btn");

    if (!input || !body) return;

    const targetMap = {
        './publications': 'publications',
        './projects': 'projects',
        './news': 'news',
        './talks': 'talks',
        './datasets': 'datasets',
        './cv': 'CV',
        './awards': 'awards',
        'home': 'home'
    };

    function executeCommand(cmdText) {
        const command = cmdText.trim().toLowerCase();
        
        if (command === 'clear') {
            body.innerHTML = '';
            return;
        }

        const echoLine = document.createElement("div");
        echoLine.className = "terminal-line";
        echoLine.innerHTML = `<span style="color: var(--color-secondary)">guest@mali-farooq:~#</span> ${cmdText}`;
        body.appendChild(echoLine);

        if (targetMap[command] || (command.startsWith('./') && targetMap[command])) {
            const normalizedCmd = command.startsWith('./') ? command : `./${command}`;
            const sectionId = targetMap[command] || targetMap[command.replace('./','')];
            const targetSection = document.getElementById(sectionId);
            
            if (targetSection) {
                const responseLine = document.createElement("div");
                responseLine.className = "terminal-line";
                responseLine.innerHTML = `[SUCCESS] Navigating matrix location target code block: ${sectionId}...`;
                body.appendChild(responseLine);
                
                targetSection.scrollIntoView({ behavior: 'smooth' });
                
                targetSection.style.outline = "2px solid var(--color-primary)";
                targetSection.style.transition = "outline 0.2s";
                setTimeout(() => { targetSection.style.outline = "none"; }, 1500);
            }
        } else {
            const errorLine = document.createElement("div");
            errorLine.className = "terminal-line";
            errorLine.style.color = "#ff5f56";
            errorLine.innerText = `Command executed cleanly but target index variable path not found: "${cmdText}"`;
            body.appendChild(errorLine);
        }
        
        body.scrollTop = body.scrollHeight;
    }

    input.addEventListener("keydown", function(e) {
        if (e.key === 'Enter') {
            executeCommand(this.value);
            this.value = '';
        }
    });

    quickBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            const cmd = this.getAttribute("data-cmd");
            executeCommand(cmd);
        });
    });
}
