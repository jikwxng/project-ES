document.addEventListener("DOMContentLoaded", () => {
    const SKIP_MENU = false; // 메뉴 건너뛰기 여부
    let isFullscreen = loadFullscreenState();

    let playingCount = 0;
    let gameStartTime = null;
    let currentStudentName = "익명";
    let currentStudentNumber = "익명";

    // IndexedDB 설정
    const DB_NAME = "ESGameDB";
    const DB_VERSION = 1;
    let db;

    const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);
    dbRequest.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("rankings")) {
            db.createObjectStore("rankings", { keyPath: "id", autoIncrement: true });
        }
    };
    dbRequest.onsuccess = (e) => {
        db = e.target.result;
    };

    function saveResult(data) {
        if (!db) return;
        const transaction = db.transaction(["rankings"], "readwrite");
        const store = transaction.objectStore("rankings");
        store.add({ ...data, timestamp: Date.now() });
    }

    function getAllRankings(callback) {
        if (!db) return;
        const transaction = db.transaction(["rankings"], "readonly");
        const store = transaction.objectStore("rankings");
        const request = store.getAll();
        request.onsuccess = () => callback(request.result);
    }

    let backgroundImage = 1;
    let direction = 1;
    const totalImages = 3;

    let backgroundInterval = null;

    backgroundInterval = setInterval(() => {
        const body = document.body;
        body.style.backgroundImage = `url("accesses/images/background/title0${backgroundImage}.png")`;

        if (backgroundImage === totalImages) {
            direction = -1;
        } else if (backgroundImage === 1) {
            direction = 1;
        }

        backgroundImage += direction;
    }, 1000 * 20);

    function saveBgmState(isBgmOn) {
        localStorage.setItem('bgm', isBgmOn ? 'on' : 'off');
    }

    function loadBgmState() {
        return localStorage.getItem('bgm') === 'on';
    }

    function saveFullscreenState(isFullscreen) {
        console.log(isFullscreen)
        localStorage.setItem('fullscreen', isFullscreen);
    }

    function loadFullscreenState() {
        return localStorage.getItem('fullscreen') === 'true';
    }

    function saveVolumeState(volume) {
        localStorage.setItem('volume', volume);
    }

    function loadVolumeState() {
        return localStorage.getItem('volume') || '0';
    }

    let bgm = new Audio("accesses/sounds/bgm_title.mp3");
    // 게임 플레이 중 재생될 BGM 레퍼런스
    let gameBgm = null;

    // --- 추가: 게임 플레이 중 모든 클릭(및 관련 입력)을 차단하는 로직 ---
    let isPlaying = false;
    let teacherTimer = null;
    let gameMouseMoveHandler = null;

    const _blockClickHandler = (e) => {
        if (isPlaying) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    function enableClickBlock() {
        // 캡쳐 단계에서 차단하여 하위 요소로의 이벤트 전파를 막음
        document.addEventListener('click', _blockClickHandler, true);
        document.addEventListener('mousedown', _blockClickHandler, true);
        document.addEventListener('mouseup', _blockClickHandler, true);
        document.addEventListener('pointerdown', _blockClickHandler, true);
        document.addEventListener('pointerup', _blockClickHandler, true);
        document.addEventListener('contextmenu', _blockClickHandler, true);
        document.addEventListener('touchstart', _blockClickHandler, true);
        document.addEventListener('touchend', _blockClickHandler, true);
    }

    function disableClickBlock() {
        isPlaying = false;
        document.removeEventListener('click', _blockClickHandler, true);
        document.removeEventListener('mousedown', _blockClickHandler, true);
        document.removeEventListener('mouseup', _blockClickHandler, true);
        document.removeEventListener('pointerdown', _blockClickHandler, true);
        document.removeEventListener('pointerup', _blockClickHandler, true);
        document.removeEventListener('contextmenu', _blockClickHandler, true);
        document.removeEventListener('touchstart', _blockClickHandler, true);
        document.removeEventListener('touchend', _blockClickHandler, true);
    }
    // --- 추가 끝 ---

    const addShrinkGrowAnimation = (element) => {
        element.style.animation = "shrink-grow 0.3s ease-in-out";
        element.addEventListener("animationend", () => {
            element.style.animation = "";
        }, {
            once: true
        });
    };


    // 스크롤 방지 및 여백 문제 해결
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener('wheel', (e) => {
        // 입력 창(range volume 등)이 아닐 때만 차단
        if (e.target.type !== 'range') {
            e.preventDefault();
        }
    }, { passive: false });

    if (!loadVolumeState()) saveVolumeState(50);

    var container = document.createElement("div");
    container.className = "container";
    container.id = "container";

    if (SKIP_MENU) {
        // 메뉴 건너뛰기 시 바로 게임 시작 (theroad 단계로 바로 이동)
        if (backgroundInterval) {
            clearInterval(backgroundInterval);
            backgroundInterval = null;
        }
        document.body.appendChild(container);

        // 초기화 필요한 변수들 설정
        isPlaying = true;
        enableClickBlock();
        gameBgm = new Audio(`accesses/sounds/bgm_main.mp3`);
        if (loadBgmState()) {
            gameBgm.loop = true;
            gameBgm.volume = (loadVolumeState() / 100);
            gameBgm.play().catch(e => console.warn(e));
        }

        document.body.style.transition = "none";
        if (!gameStartTime) gameStartTime = Date.now();
        if (playingCount === 0) playingCount = 1;
        handleRoadComplete();
    } else {
        // 기존 메뉴 프로세스 시작
        displayTitleScreen();
    }

    function displayTitleScreen() {
        const madeBy = document.createElement("div");
        madeBy.className = "madeBy";
        madeBy.id = "madeBy";
        madeBy.innerHTML = `<span>Made by JEEKS</span>`;
        document.body.appendChild(madeBy);

        const madeByElement = document.getElementById("madeBy");
        const madeBySpan = madeByElement.querySelector("span");

        setTimeout(() => {
            madeBySpan.style.opacity = "1";
        }, 100);

        setTimeout(() => {
            madeBySpan.style.opacity = "0";
            setTimeout(() => {
                madeByElement.style.opacity = "0";
                if (loadBgmState()) {
                    setTimeout(() => {
                        bgm.loop = true;
                        bgm.volume = (loadVolumeState() / 100);
                        bgm.play().catch((error) => {
                            alert(error);
                        });
                    }, 200);
                }
                setTimeout(() => {
                    madeByElement.remove();
                }, 400);
            }, 400);
        }, 900);

        document.body.style.transition = "opacity 0.3s ease-in-out, background-image 0.5s ease-in-out";

        document.body.appendChild(container);

        container.innerHTML = `
        <div class="title">
            <img src="accesses/images/icon/title.png" alt="title">
        </div>
        <div id="clock" class="clock">
        <img src="accesses/images/background/clock.png" alt="" id="clock">
        </div>
        <div class="start">
            <img src="accesses/images/UI/start.png" alt="start" id="start">
        </div>
        <div class="setting" id="setting">
            <img src="accesses/images/UI/setting.png" alt="setting">
        </div> 
        <div class="setting-window" id="setting-window">
            <div class="close">
                <img src="accesses/images/UI/cancel.png" alt="close" id="close">
            </div>
            <div class="content">
                <h1>게임 설정</h1>
                <span>음악볼륨:<input type="range" class="rangeInput" name="rangePicker" min="0" max="100" value="0"><span id="range">0%</span></span>
                <span class="checkbox">배경음악:<img src="accesses/images/UI/checkbox02.png" id="bgmCheckbox"/></span>
                <span class="checkbox">전체화면:<img src="accesses/images/UI/checkbox01.png" id="fullscreenCheckbox"/></span>
                <span><img src="accesses/images/UI/danger.png" alt="" id="exit" class="exit"></span>
                <span><img src="accesses/images/UI/refresh.png" alt="" id="refresh" class="refresh"></span>
            </div>
        </div>
    `;
        document.body.appendChild(container);

        const checkbox = document.getElementById("fullscreenCheckbox");
        if (isFullscreen) {
            checkbox.src = "accesses/images/UI/checkbox02.png";
        } else {
            checkbox.src = "accesses/images/UI/checkbox01.png";
        }

        defineLlisteners();

        const bgmCheckbox = document.getElementById("bgmCheckbox");
        if (localStorage.getItem('bgm') === null) {
            saveBgmState(true);
            bgmCheckbox.src = "accesses/images/UI/checkbox02.png";
            bgm.loop = true;
            bgm.volume = 0.5;
            bgm.play();
        } else {
            if (loadBgmState()) {
                bgmCheckbox.src = "accesses/images/UI/checkbox02.png";
            } else {
                bgmCheckbox.src = "accesses/images/UI/checkbox01.png";
            }
        }


        document.getElementById("start").addEventListener("click", (event) => {
            clearInterval(backgroundInterval);
            addShrinkGrowAnimation(event.target);
            document.body.style.opacity = "0";
            const container = document.getElementById("container");
            setTimeout(() => {
                container.innerHTML = `<div class="setting" id="setting">
            <img src="accesses/images/UI/setting.png" alt="setting">
        </div> 
        <div class="setting-window" id="setting-window">
            <div class="close">
                <img src="accesses/images/UI/cancel.png" alt="close" id="close">
            </div>
            <div class="content">
                <h1>게임 설정</h1>
                <span>음악볼륨:<input type="range" class="rangeInput" name="rangePicker" min="0" max="100" value="0"><span id="range">0%</span></span>
                <span class="checkbox">배경음악:<img src="accesses/images/UI/checkbox02.png" id="bgmCheckbox"/></span>
                <span class="checkbox">전체화면:<img src="accesses/images/UI/checkbox${isFullscreen ? "02" : "01"}.png" id="fullscreenCheckbox"/></span>
                <span><img src="accesses/images/UI/danger.png" alt="" id="exit" class="exit"></span>
                <span><img src="accesses/images/UI/refresh.png" alt="" id="refresh" class="refresh"></span>
            </div>
        </div>`;

                defineLlisteners();
                const studentCard = document.createElement("div");
                studentCard.className = "student-card";
                studentCard.innerHTML = `
                <img src="accesses/images/GUI/studentCard.png" alt="card">
                <img src="accesses/images/UI/go.png" alt="go" id="go">
                <form id="studentForm">
                    <input spellcheck="false" type="text" id="name" value="김학생" required class="name-input">
                    <input spellcheck="false" type="number" id="studentNumber" value="10427" required class="studentNO-input">
                    <button type="submit" id="goButton" style="display: none;"></button>
                </form>
            `;
                container.appendChild(studentCard);
                document.body.style.opacity = "1";

                document.body.style.backgroundImage = `url("accesses/images/background/student-card.png")`;

                const goButton = document.getElementById("go");
                const studentForm = document.getElementById("studentForm");

                goButton.addEventListener("click", () => {
                    studentForm.reportValidity();
                    if (studentForm.checkValidity()) {
                        currentStudentName = document.getElementById("name").value;
                        currentStudentNumber = document.getElementById("studentNumber").value;

                        addShrinkGrowAnimation(goButton);
                        document.body.style.opacity = "0";
                        document.body.style.background = "black";


                        const fadeOutInterval = setInterval(() => {
                            if (bgm.volume > 0.1) {
                                bgm.volume -= 0.1;
                            } else {
                                bgm.volume = 0;
                                clearInterval(fadeOutInterval);
                            }
                        }, 100);

                        setTimeout(() => {

                            // 타이틀 BGM 완전 정지(페이드아웃 후 남아있을 수 있음)
                            try {
                                if (bgm) {
                                    bgm.pause();
                                    if (typeof bgm.remove === 'function') bgm.remove();
                                    bgm = null;
                                }
                            } catch (e) {
                                console.warn('Error stopping title bgm', e);
                            }

                            gameStart()


                        }, 1000);
                    }
                });
            }, 500);
        });
    } // end of displayTitleScreen


    function gameStart() {
        if (backgroundInterval) {
            clearInterval(backgroundInterval);
            backgroundInterval = null;
        }

        // 재시작 시 container가 body에서 제거되었을 수 있으므로 다시 확인
        if (!document.getElementById("container")) {
            document.body.appendChild(container);
        }

        // 게임 시작: 클릭 차단 활성화
        isPlaying = true;
        enableClickBlock();

        if (gameBgm) {
            gameBgm.pause();
            gameBgm = null;
        }
        gameBgm = new Audio(`accesses/sounds/bgm_main.mp3`)

        setTimeout(() => {
            if (loadBgmState()) {
                setTimeout(() => {
                    gameBgm.loop = true;
                    gameBgm.volume = (loadVolumeState() / 100);
                    gameBgm.play().catch((error) => {
                        alert(error);
                    });
                }, 200);
            }
        })

        playingCount++;
        if (!gameStartTime) gameStartTime = Date.now();
        document.body.style.transition = "none";
        container.innerHTML = '';

        document.body.style.opacity = "1";
        // document.body.style.transition = "opacity 0.3s, background-image 0.5s";

        document.body.style.backgroundImage = `url("accesses/images/background/classroom.png")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";

        // document.addEventListener("click", (event) => {
        //     const clientX = event.clientX;
        //     const clientY = event.clientY;
        //     alert(`Client X: ${clientX}, Client Y: ${clientY}`);
        // })

        const cursorImg = document.createElement("img");
        cursorImg.id = "cursorImg";
        cursorImg.src = "accesses/images/people/hero.png";
        cursorImg.style.position = "absolute";
        cursorImg.style.pointerEvents = "none";
        cursorImg.style.zIndex = "999";
        document.body.style.cursor = "none";
        document.body.appendChild(cursorImg);

        let lastX = null;

        const startX = window.innerWidth * 0.8;
        const startY = window.innerHeight * 0.8;

        cursorImg.style.left = `calc(${startX}px - 3vw)`;
        cursorImg.style.top = `calc(${startY}px - 3vw + 50px)`;

        let mouseStartX = null;
        let mouseStartY = null;

        const speed = 1;


        const windows = document.createElement("img");
        windows.id = "windows";
        windows.src = "accesses/images/background/classroom_window.png";
        windows.style.width = "16vw";
        windows.style.position = "absolute";
        windows.style.left = "70%";
        windows.style.top = "15%";
        windows.style.transform = "translate(-50%, -50%)";
        document.body.appendChild(windows);


        const classmates01 = document.createElement("img");
        classmates01.id = "classmates01";
        classmates01.src = "accesses/images/background/classmates01.png";
        classmates01.style.width = "37.5vh";
        classmates01.style.display = "block";
        classmates01.style.position = "absolute";
        classmates01.style.left = "61%";
        classmates01.style.top = "72%";
        classmates01.style.transform = "translate(-50%, -50%)";


        document.body.appendChild(classmates01);

        const classmates02 = document.createElement("img");
        classmates02.id = "classmates02";
        classmates02.src = "accesses/images/background/classmates02.png";
        classmates02.style.width = "31.5vh";
        classmates02.style.display = "block";
        classmates02.style.position = "absolute";
        classmates02.style.left = "81%";
        classmates02.style.top = "60%";
        classmates02.style.transform = "translate(-50%, -50%)";


        document.body.appendChild(classmates02);

        const classDoor = document.createElement("img");
        classDoor.id = "classmates02";
        classDoor.src = "accesses/images/background/classroom_door.png";
        classDoor.style.width = "30vh";
        classDoor.style.display = "block";
        classDoor.style.position = "absolute";
        classDoor.style.left = "25%";
        classDoor.style.top = "15vh";
        classDoor.style.transform = "translate(-50%, -50%)";


        document.body.appendChild(classDoor);



        const teacherWrapper = document.createElement("div");
        teacherWrapper.style.position = "absolute";
        teacherWrapper.style.left = "10vw";
        teacherWrapper.style.top = "60%";
        teacherWrapper.style.transform = "translateY(-50%)";
        teacherWrapper.style.display = "flex";
        teacherWrapper.style.alignItems = "center";
        teacherWrapper.style.zIndex = "100";


        const teacherImg = document.createElement("img");
        teacherImg.id = "teacher";
        teacherImg.src = "accesses/images/people/classroom_teacher_BACK.png";
        teacherImg.style.height = "30vh";
        teacherImg.style.display = "block";


        const teacherText = document.createElement("div");
        teacherText.textContent = "코사인 . . 탄젠트 . .";
        teacherText.style.fontSize = "2.5vw";
        teacherText.style.fontWeight = "bold";
        teacherText.style.marginLeft = "2vw";
        teacherText.style.marginBottom = "5vh";
        teacherText.style.color = "#222";

        teacherWrapper.appendChild(teacherImg);
        teacherWrapper.appendChild(teacherText);
        document.body.appendChild(teacherWrapper);

        let isFront = false;
        let lastPageX = null;
        let lastPageY = null;
        let freezeX = null;
        let freezeY = null;
        let lastTurnTime = 0;

        function toggleTeacherImage() {
            isFront = !isFront;
            teacherImg.src = `accesses/images/people/classroom_teacher_${isFront ? "FRNT" : "BACK"}.png`;
            if (isFront) {
                teacherText.textContent = ". . !";
                // 뒤돌아볼 때 위치 고정
                freezeX = lastPageX;
                freezeY = lastPageY;
                lastTurnTime = Date.now(); // 선생님이 돈 시각 기록
            } else {
                teacherText.textContent = "코사인 . . 탄젠트 . .";
            }

            const nextTime = Math.random() * 1000 + 500;
            teacherTimer = setTimeout(toggleTeacherImage, nextTime);
        }

        // 처음에는 BACK 상태를 좀 더 길게 유지 (2~4초)
        teacherTimer = setTimeout(toggleTeacherImage, Math.random() * 1000 + 500);

        const targets = [
            classmates01,
            classmates02,
            classmates02,
            windows,
            classDoor
        ];

        const margin = -70;
        let crashedId = null

        gameMouseMoveHandler = (e) => {
            // 1. 이미 충돌해서 게임오버 상태라면 로직을 실행하지 않음
            if (!isPlaying) return;

            lastPageX = e.pageX;
            lastPageY = e.pageY;

            if (isFront) {
                // 선생님이 보고 있을 때 움직이면 체크
                if (freezeX === null || freezeY === null) {
                    freezeX = e.pageX;
                    freezeY = e.pageY;
                }

                // 조금 움직이는 건 무시 (거리 계산)
                const dist = Math.hypot(e.pageX - freezeX, e.pageY - freezeY);
                // 선생님이 뒤돈 직후 0.5초 동안은 무시
                if (Date.now() - lastTurnTime > 500) {
                    if (dist > 15) {
                        handleGameOver('teacher');
                    }
                }
                // return; // 움직임 반영을 위해 리턴 제거
            }

            if (mouseStartX === null || mouseStartY === null) {
                mouseStartX = e.pageX;
                mouseStartY = e.pageY;
            }

            const dx = e.pageX - mouseStartX;
            const dy = e.pageY - mouseStartY;

            const imgX = startX + dx * speed - cursorImg.offsetWidth / 2;
            const imgY = (startY + dy * speed - cursorImg.offsetHeight / 2) + 50;

            cursorImg.style.top = imgY + "px";
            cursorImg.style.left = imgX + "px";

            if (lastX !== null) {
                cursorImg.style.transform = e.pageX < lastX ? "scaleX(1)" : "scaleX(-1)";
            }
            lastX = e.pageX;

            // 2. 충돌 감지 로직 개선
            const imgRect = cursorImg.getBoundingClientRect();
            let detectedTarget = null;
            let detectedTargetId = null;

            for (const target of targets) {
                if (!target) continue;
                const rect = target.getBoundingClientRect();

                // 히트박스 보정 (margin 적용)
                const isHit = (
                    imgRect.left < rect.right + margin &&
                    imgRect.right > rect.left - margin &&
                    imgRect.top < rect.bottom + margin &&
                    imgRect.bottom > rect.top - margin
                );

                if (isHit) {
                    detectedTarget = target;
                    detectedTargetId = target.id;
                    break; // 충돌 대상 하나만 찾으면 즉시 중단
                }
            }


            // 3. 충돌 결과 처리
            if (detectedTarget) {
                if (detectedTarget === classDoor) {
                    handleLevelComplete();
                    return;
                }
                handleGameOver(detectedTargetId);
            }
        };
        document.addEventListener("mousemove", gameMouseMoveHandler);

    }

    function handleGameOver(targetId) {
        isPlaying = false; // 충돌 즉시 게임 중지 상태로 변경

        if (teacherTimer) clearTimeout(teacherTimer);
        if (gameMouseMoveHandler) {
            document.removeEventListener("mousemove", gameMouseMoveHandler);
            gameMouseMoveHandler = null;
        }

        // 모든 사운드 정지
        [gameBgm, bgm].forEach(audio => {
            if (audio) {
                audio.pause();
                audio = null;
            }
        });

        disableClickBlock();
        document.body.style.cursor = `url("accesses/images/UI/curser.png") 1 1, pointer`;
        document.body.style.transition = "none";


        let deathImage = "death01.png";
        if (targetId === 'windows') {
            deathImage = "death02.png";
            new Audio("accesses/sounds/break.mp3").play();
        } else if (targetId === 'teacher') {
            deathImage = "death03.png";
        } else if (targetId === 'object01') {
            deathImage = "death04.png";
        } else if (targetId === 'object02') {
            deathImage = "death05.png";
        } else if (targetId === 'football') {
            deathImage = "death06.png";
        } else if (targetId === 'object01_tree') {
            deathImage = "death07.png";
        } else if (targetId === 'plank') {
            deathImage = "death08.png";
        } else if (targetId === 'car') {
            deathImage = "death09.png";
        }

        document.body.innerHTML = "";
        document.body.style.backgroundImage = `url("accesses/images/background/death/${deathImage}")`;

        // 재시작 버튼 생성
        const retry = document.createElement("img");
        retry.src = "accesses/images/UI/refresh.png";
        retry.style.cssText = "position:absolute; top:80%; left:85%; transform:translate(-50%, -50%); width:20vw; z-index:1000; cursor:pointer;";
        document.body.appendChild(retry);

        // 재시작 이벤트 (한 번만 등록)
        retry.onclick = () => {
            document.body.innerHTML = "";
            gameStart();
        };
    }

    function handleLevelComplete() {
        isPlaying = false;

        if (teacherTimer) clearTimeout(teacherTimer);
        if (gameMouseMoveHandler) {
            document.removeEventListener("mousemove", gameMouseMoveHandler);
            gameMouseMoveHandler = null;
        }

        // 복도 진입 시 BGM은 유지 (기존 정지 로직 제거)

        const cursorImg = document.getElementById("cursorImg");
        disableClickBlock();
        document.body.innerHTML = "";
        document.body.style.backgroundImage = `url("accesses/images/background/hallway.png")`;

        const object01 = document.createElement("div");
        object01.id = "object01";
        object01.style.backgroundColor = "transparent" // Changed from blue to transparent for better look, but kept the logic
        object01.style.position = "absolute";
        object01.style.left = "22vw";
        object01.style.top = "55.5%";
        object01.style.transform = "translateY(-50%)";
        object01.style.display = "flex";
        object01.style.alignItems = "center";
        object01.style.zIndex = "100";
        object01.style.width = "18vw";
        object01.style.height = "13vw";
        // object01.style.opacity = "0.5";
        document.body.appendChild(object01);

        const object02 = document.createElement("div");
        object02.id = "object02";
        object02.style.backgroundColor = "transparent"
        object02.style.position = "absolute";
        object02.style.left = "56vw";
        object02.style.top = "54%";
        object02.style.transform = "translateY(-50%)";
        object02.style.display = "flex";
        object02.style.alignItems = "center";
        object02.style.zIndex = "100";
        object02.style.width = "18vw";
        object02.style.height = "14vw";
        // object02.style.opacity = "0.5";
        document.body.appendChild(object02);

        const windows = document.createElement("div");
        windows.id = "windows";
        windows.style.backgroundColor = "transparent"
        windows.style.position = "absolute";
        windows.style.left = "72.5vw";
        windows.style.top = "17.3%";
        windows.style.transform = "translateY(-50%)";
        windows.style.display = "flex";
        windows.style.alignItems = "center";
        windows.style.zIndex = "100";
        windows.style.width = "20vw";
        windows.style.height = "12vw";
        // windows.style.opacity = "0.5";
        document.body.appendChild(windows);

        const football = document.createElement("img");
        football.src = "accesses/images/background/football.png";
        football.style.position = "absolute";
        football.style.left = "11.5vw"; // 선수 1
        football.style.top = "84.5%";
        football.style.transform = "translateY(-50%)";
        football.style.display = "flex";
        football.style.alignItems = "center";
        football.style.zIndex = "100";
        football.style.width = "6.5vw";
        football.style.height = "auto";
        football.id = "football";
        document.body.appendChild(football);

        const exit = document.createElement("div");
        exit.id = "exit";
        exit.style.backgroundColor = "transparent"
        exit.style.position = "absolute";
        exit.style.left = "95vw";
        exit.style.top = "54%";
        exit.style.transform = "translateY(-50%)";
        exit.style.display = "flex";
        exit.style.alignItems = "center";
        exit.style.zIndex = "100";
        exit.style.width = "5vw";
        exit.style.height = "17vw";
        // exit.style.opacity = "0.5";
        document.body.appendChild(exit);

        isPlaying = true; // 다시 게임 중으로 설정

        function checkHallwayCollisions() {
            if (!isPlaying) return;
            const imgRect = cursorImg.getBoundingClientRect();
            // margin을 적절히 주어 판정 완화 (classroom과 유사하게)
            const collisionMargin = -20;

            [object01, object02, football, windows, exit].forEach(target => {
                if (!target) return;
                const rect = target.getBoundingClientRect();
                const isHit = (
                    imgRect.left < rect.right + collisionMargin &&
                    imgRect.right > rect.left - collisionMargin &&
                    imgRect.top < rect.bottom + collisionMargin &&
                    imgRect.bottom > rect.top - collisionMargin
                );

                if (isHit) {
                    if (target.id === 'exit') {
                        handleHallwayComplete();
                    } else {
                        handleGameOver(target.id);
                    }
                }
            });
        }

        // 축구공 애니메이션 변수
        let footballProg = 0;
        let footballDir = 1; // 1: P1->P2, -1: P2->P1
        let isWaiting = false;
        let waitStartTime = 0;
        let lastTimestamp = performance.now();

        function animateFootball(timestamp) {
            if (!isPlaying) return;

            const delta = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            if (isWaiting) {
                if (timestamp - waitStartTime >= 500) {
                    isWaiting = false;
                    footballProg = 0;
                    footballDir *= -1;
                }
            } else {
                // 1.2초 동안 날아감
                footballProg += delta / 1200;
                if (footballProg >= 1) {
                    footballProg = 1;
                    isWaiting = true;
                    waitStartTime = timestamp;
                }
            }

            // 포물선 궤적 계산
            // x: 11.5vw ~ 78vw
            // y: 84.5% (바닥) ~ 약 40% (꼭대기)
            let t = footballProg;
            let currentT = footballDir === 1 ? t : 1 - t;

            const startX = 11.5;
            const endX = 78;
            const x = startX + (endX - startX) * currentT;

            // h(t) = 4 * height * t * (1-t)
            const jumpHeight = 35; // %
            const yBase = 84.5; // %
            const y = yBase - (4 * jumpHeight * t * (1 - t));

            football.style.left = x + "vw";
            football.style.top = y + "%";

            checkHallwayCollisions();
            requestAnimationFrame(animateFootball);
        }
        requestAnimationFrame(animateFootball);

        if (cursorImg) {
            document.body.appendChild(cursorImg);
            document.body.style.cursor = "none";

            let lastXHallway = null;
            // 복도에서는 단순 이동 (속도 1:1)
            gameMouseMoveHandler = (e) => {
                if (!isPlaying) return;
                const imgRect = cursorImg.getBoundingClientRect();
                // 중앙 정렬을 위해 보정
                cursorImg.style.left = (e.pageX - imgRect.width / 2) + "px";
                cursorImg.style.top = (e.pageY - imgRect.height / 2) + "px";

                if (lastXHallway !== null) {
                    cursorImg.style.transform = e.pageX < lastXHallway ? "scaleX(1)" : "scaleX(-1)";
                }
                lastXHallway = e.pageX;

                checkHallwayCollisions();
            };
            document.addEventListener("mousemove", gameMouseMoveHandler);
        } else {
            document.body.style.cursor = `url("accesses/images/UI/curser.png") 1 1, pointer`;
        }
    }

    function handleHallwayComplete() {
        isPlaying = false; // 일시 중지 후 재설정

        if (gameMouseMoveHandler) {
            document.removeEventListener("mousemove", gameMouseMoveHandler);
            gameMouseMoveHandler = null;
        }

        // cursorImg 가 없으면(바로 점프한 경우 등) 생성
        let cursorImg = document.getElementById("cursorImg");
        if (!cursorImg) {
            cursorImg = document.createElement("img");
            cursorImg.id = "cursorImg";
            cursorImg.src = "accesses/images/people/hero.png";
            cursorImg.style.position = "absolute";
            cursorImg.style.pointerEvents = "none";
            cursorImg.style.zIndex = "999";
        }

        document.body.innerHTML = "";
        document.body.style.backgroundImage = `url("accesses/images/background/thetree.png")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";

        const tree = document.createElement("img");
        tree.src = "accesses/images/background/tree.png";
        tree.style.position = "absolute";
        tree.style.left = "58vw";
        tree.style.top = "23.5%";
        tree.style.transform = "translateY(-50%)";
        tree.style.display = "flex";
        tree.style.alignItems = "center";
        tree.style.zIndex = "100";
        tree.style.width = "30vw";
        tree.style.height = "auto";
        tree.id = "tree";
        document.body.appendChild(tree);

        const plank = document.createElement("img");
        plank.src = "accesses/images/background/plank.png";
        plank.style.position = "absolute";
        plank.style.left = "48vw";
        plank.style.top = "80%";
        plank.style.transform = "translateY(-50%)";
        plank.style.display = "flex";
        plank.style.alignItems = "center";
        plank.style.zIndex = "100";
        plank.style.width = "22vw";
        plank.style.height = "auto";
        plank.id = "plank";
        document.body.appendChild(plank);

        const tree02 = document.createElement("img");
        tree02.src = "accesses/images/background/tree02.png";
        tree02.style.position = "absolute";
        tree02.style.left = "45vw";
        tree02.style.top = "35%";
        tree02.style.transform = "translateY(-50%)";
        tree02.style.display = "flex";
        tree02.style.alignItems = "center";
        tree02.style.zIndex = "100";
        tree02.style.width = "30vw";
        tree02.style.height = "auto";
        tree02.style.display = "none";
        tree02.id = "tree02";
        document.body.appendChild(tree02);

        const object01 = document.createElement("div");
        object01.id = "object01_tree";
        object01.style.backgroundColor = "transparent"
        object01.style.position = "absolute";
        object01.style.left = "50vw";
        object01.style.top = "54%";
        object01.style.transform = "translateY(-50%)";
        object01.style.display = "flex";
        object01.style.alignItems = "center";
        object01.style.zIndex = "10";
        object01.style.width = "18vw";
        object01.style.height = "100vw";
        // object01.style.opacity = "0.5";
        document.body.appendChild(object01);

        const exit = document.createElement("div");
        exit.id = "exit";
        exit.style.backgroundColor = "transparent"
        exit.style.position = "absolute";
        exit.style.left = "0vw";
        exit.style.top = "50vh";
        exit.style.transform = "translateY(-50%)";
        exit.style.display = "flex";
        exit.style.alignItems = "center";
        exit.style.zIndex = "100";
        exit.style.width = "10vw";
        exit.style.height = "100vh";
        // exit.style.opacity = "0.5";
        document.body.appendChild(exit);

        if (cursorImg) {
            document.body.appendChild(cursorImg);
            document.body.style.cursor = "none";
            const startX = window.innerWidth * 0.1;
            const startY = window.innerHeight * 0.8;
            cursorImg.style.left = startX + "px";
            cursorImg.style.top = startY + "px";

            function checkTreeCollisions() {
                if (!isPlaying) return;
                const imgRect = cursorImg.getBoundingClientRect();

                // 히트박스 보정값 (값이 작을수록 히트박스가 작아짐)
                const treeMarginX = -110; // 나무 너비 히트박스 축소
                const treeMarginY = -60;
                const tree02MarginX = -20;
                const tree02MarginY = -100; // tree02 높이 히트박스 축소
                const plankMargin = -50;
                const generalMargin = -20;

                // 1. 트리 상호작용 (tree01 -> tree02 팝업)
                if (tree.style.display !== 'none') {
                    const rect = tree.getBoundingClientRect();
                    if (imgRect.left < rect.right + treeMarginX &&
                        imgRect.right > rect.left - treeMarginX &&
                        imgRect.top < rect.bottom + treeMarginY &&
                        imgRect.bottom > rect.top - treeMarginY) {
                        tree.style.display = 'none';
                        tree02.style.display = 'block';
                    }
                }

                // tree02 접촉 여부 확인
                let isTouchingTree02 = false;
                if (tree02.style.display === 'block') {
                    const rect = tree02.getBoundingClientRect();
                    if (imgRect.left < rect.right + tree02MarginX &&
                        imgRect.right > rect.left - tree02MarginX &&
                        imgRect.top < rect.bottom + tree02MarginY &&
                        imgRect.bottom > rect.top - tree02MarginY) {
                        isTouchingTree02 = true;
                    }
                }

                // 2. 게임오버 장애물 체크
                const pRect = plank.getBoundingClientRect();
                if (imgRect.left < pRect.right + plankMargin &&
                    imgRect.right > pRect.left - plankMargin &&
                    imgRect.top < pRect.bottom + plankMargin &&
                    imgRect.bottom > pRect.top - plankMargin) {
                    handleGameOver('plank');
                    return;
                }

                const oRect = object01.getBoundingClientRect();
                if (!isTouchingTree02) {
                    if (imgRect.left < oRect.right + generalMargin &&
                        imgRect.right > oRect.left - generalMargin &&
                        imgRect.top < oRect.bottom + generalMargin &&
                        imgRect.bottom > oRect.top - generalMargin) {
                        handleGameOver('object01_tree');
                    }
                }

                // exit 충돌 체크 (다음 레벨로 이동)
                const exitRect = exit.getBoundingClientRect();
                if (imgRect.left < exitRect.right + generalMargin &&
                    imgRect.right > exitRect.left - generalMargin &&
                    imgRect.top < exitRect.bottom + generalMargin &&
                    imgRect.bottom > exitRect.top - generalMargin) {
                    handleTreeComplete();
                }
            }

            isPlaying = true;
            let lastXWalls = null;
            gameMouseMoveHandler = (e) => {
                if (!isPlaying) return;
                const imgRect = cursorImg.getBoundingClientRect();
                cursorImg.style.left = (e.pageX - imgRect.width / 2) + "px";
                cursorImg.style.top = (e.pageY - imgRect.height / 2) + "px";

                if (lastXWalls !== null) {
                    cursorImg.style.transform = e.pageX < lastXWalls ? "scaleX(1)" : "scaleX(-1)";
                }
                lastXWalls = e.pageX;

                checkTreeCollisions();
            };
            document.addEventListener("mousemove", gameMouseMoveHandler);
        }
    }

    function handleTreeComplete() {
        isPlaying = false;

        if (gameMouseMoveHandler) {
            document.removeEventListener("mousemove", gameMouseMoveHandler);
            gameMouseMoveHandler = null;
        }

        // cursorImg 가 없으면(바로 점프한 경우 등) 생성
        let cursorImg = document.getElementById("cursorImg");
        if (!cursorImg) {
            cursorImg = document.createElement("img");
            cursorImg.id = "cursorImg";
            cursorImg.src = "accesses/images/people/hero.png";
            cursorImg.style.position = "absolute";
            cursorImg.style.pointerEvents = "none";
            cursorImg.style.zIndex = "999";
        }

        document.body.innerHTML = "";
        document.body.style.backgroundImage = `url("accesses/images/background/theroad.png")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";

        const roadCars = [];

        function createRoadCar(lane) {
            const isLeft = lane === 'left';
            const carImg = document.createElement("img");
            carImg.style.position = "absolute";
            carImg.style.left = isLeft ? "32vw" : "56vw";
            carImg.style.zIndex = "10";
            carImg.style.width = isLeft ? "13vw" : "12vw";
            carImg.style.height = "auto";
            carImg.style.transform = "translateY(-50%)";
            document.body.appendChild(carImg);

            const carObj = {
                el: carImg,
                lane: lane,
                top: isLeft ? -30 : 130,
                speed: 0.7 + Math.random() * 1.1,
                direction: isLeft ? 1 : -1,
                isWaiting: true,
                respawnTime: Date.now() + Math.random() * 2000 // 초기 분산 소환
            };
            return carObj;
        }

        function resetCar(carObj) {
            // 소환 시 같은 차선의 다른 차와 겹치지 않게 거리 확인
            const otherInLane = roadCars.find(c => c !== carObj && c.lane === carObj.lane && !c.isWaiting);
            if (otherInLane) {
                const spawnPos = carObj.direction === 1 ? -30 : 130;
                if (Math.abs(otherInLane.top - spawnPos) < 50) {
                    // 너무 가까우면 소환을 조금 미룸
                    carObj.respawnTime = Date.now() + 500;
                    return;
                }
            }

            const randomNum = Math.floor(Math.random() * 4) + 1;
            const isRight = carObj.lane === 'right';
            carObj.el.src = `accesses/images/background/car0${randomNum}${isRight ? '_' : ''}.png`;
            carObj.speed = 0.7 + Math.random() * 1.1; // 0.7 ~ 1.8
            carObj.top = carObj.direction === 1 ? -30 : 130;
            carObj.el.style.top = carObj.top + "%";
            carObj.isWaiting = false;
        }

        // 라인당 최대 2대씩 생성
        roadCars.push(createRoadCar('left'));
        roadCars.push(createRoadCar('left'));
        roadCars.push(createRoadCar('right'));
        roadCars.push(createRoadCar('right'));

        const exit = document.createElement("div");
        exit.id = "exit";
        exit.style.backgroundColor = "transparent"
        exit.style.position = "absolute";
        exit.style.right = "0vw";
        exit.style.top = "50vh";
        exit.style.transform = "translateY(-50%)";
        exit.style.display = "flex";
        exit.style.alignItems = "center";
        exit.style.zIndex = "100";
        exit.style.width = "10vw";
        exit.style.height = "100vh";
        document.body.appendChild(exit);

        // --- 자동차 애니메이션 로직 ---
        function animateRoad() {
            if (!isPlaying) return;
            const now = Date.now();

            // 차선별 추월 및 겹침 방지 로직
            ['left', 'right'].forEach(lane => {
                const laneGroup = roadCars.filter(c => c.lane === lane && !c.isWaiting);
                if (laneGroup.length < 2) return;

                // 정렬: 앞에 있는 차가 0번 인덱스
                const isLeft = lane === 'left';
                laneGroup.sort((a, b) => isLeft ? b.top - a.top : a.top - b.top);

                const head = laneGroup[0];
                const tail = laneGroup[1];

                const dist = Math.abs(head.top - tail.top);
                const safeDist = 50; // 기본 안전 거리 (%)

                if (dist < safeDist) {
                    // 뒤차가 더 빠르면 앞차 속도에 맞춤 (추월 방지)
                    if (tail.speed > head.speed) {
                        tail.speed = head.speed;
                    }
                    // 거리가 너무 좁혀지면 속도를 일시적으로 더 늦춤
                    if (dist < safeDist * 0.8) {
                        tail.speed = head.speed * 0.9;
                    }
                }
            });

            roadCars.forEach(car => {
                if (car.isWaiting) {
                    if (now >= car.respawnTime) {
                        resetCar(car);
                    }
                    return;
                }

                car.top += car.direction * car.speed;
                car.el.style.top = car.top + "%";

                // 화면 밖으로 나갔는지 체크
                if ((car.direction === 1 && car.top > 130) || (car.direction === -1 && car.top < -30)) {
                    car.isWaiting = true;
                    car.respawnTime = now + 500 + Math.random() * 500; // 0.5~1초 대기
                    car.el.style.top = "-500px"; // 화면 밖 배치
                }
            });

            checkRoadCollisions();
            requestAnimationFrame(animateRoad);
        }

        function checkRoadCollisions() {
            if (!isPlaying) return;
            const imgRect = cursorImg.getBoundingClientRect();
            const margin = -20;

            // 자동차들과의 충돌 체크
            roadCars.forEach(car => {
                if (car.isWaiting) return;
                const rect = car.el.getBoundingClientRect();
                if (imgRect.left < rect.right + margin &&
                    imgRect.right > rect.left - margin &&
                    imgRect.top < rect.bottom + margin &&
                    imgRect.bottom > rect.top - margin) {
                    handleGameOver('car');
                }
            });

            // 출구 체크
            const exitRect = exit.getBoundingClientRect();
            if (imgRect.left < exitRect.right + margin &&
                imgRect.right > exitRect.left - margin &&
                imgRect.top < exitRect.bottom + margin &&
                imgRect.bottom > exitRect.top - margin) {
                handleRoadComplete();
            }
        }
        // --- 애니메이션 끝 ---

        if (cursorImg) {
            document.body.appendChild(cursorImg);
            document.body.style.cursor = "none";
            // 시작 위치 설정 (출구인 오른쪽과 겹치지 않게 왼쪽에서 시작)
            const startX = 0;
            const startY = window.innerHeight * 0.8;
            cursorImg.style.left = startX + "px";
            cursorImg.style.top = startY + "px";

            isPlaying = true;
            let lastXRoad = null;
            gameMouseMoveHandler = (e) => {
                if (!isPlaying) return;
                const imgRect = cursorImg.getBoundingClientRect();
                cursorImg.style.left = (e.pageX - imgRect.width / 2) + "px";
                cursorImg.style.top = (e.pageY - imgRect.height / 2) + "px";

                if (lastXRoad !== null) {
                    cursorImg.style.transform = e.pageX < lastXRoad ? "scaleX(1)" : "scaleX(-1)";
                }
                lastXRoad = e.pageX;
            };
            document.addEventListener("mousemove", gameMouseMoveHandler);

            // 애니메이션 시작
            requestAnimationFrame(animateRoad);
        }
    }

    function handleRoadComplete() {
        isPlaying = false;

        if (gameMouseMoveHandler) {
            document.removeEventListener("mousemove", gameMouseMoveHandler);
            gameMouseMoveHandler = null;
        }

        document.body.innerHTML = "";
        document.body.style.backgroundImage = `url("accesses/images/background/theend.png")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.cursor = "url('accesses/images/UI/curser.png'), auto";

        const tryCoundEl = document.createElement("div");
        tryCoundEl.id = "try-count";
        tryCoundEl.textContent = `${playingCount}번`;
        tryCoundEl.style.position = "absolute";
        tryCoundEl.style.top = "20vh";
        tryCoundEl.style.left = "10vw";
        tryCoundEl.style.fontWeight = "bold";
        tryCoundEl.style.fontSize = "10vw";
        tryCoundEl.style.alignItems = "center";
        tryCoundEl.style.color = "black";
        tryCoundEl.style.textAlign = "center";
        document.body.appendChild(tryCoundEl);

        const playingTimeEl = document.createElement("div");
        playingTimeEl.id = "playing-time";

        // 시간 계산
        let timeString = "00:00.00";
        if (gameStartTime) {
            const elapsed = Date.now() - gameStartTime;
            const mins = Math.floor(elapsed / 60000);
            const secs = Math.floor((elapsed % 60000) / 1000);
            const ms = Math.floor((elapsed % 1000) / 10);
            timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }

        playingTimeEl.textContent = timeString;
        playingTimeEl.style.position = "absolute";
        playingTimeEl.style.top = "64vh";
        playingTimeEl.style.left = "5vw";
        playingTimeEl.style.fontWeight = "bold";
        playingTimeEl.style.fontSize = "7.5vw";
        playingTimeEl.style.alignItems = "center";
        playingTimeEl.style.color = "black";
        playingTimeEl.style.textAlign = "center";
        document.body.appendChild(playingTimeEl);

        const ranking = document.createElement("img");
        ranking.src = "accesses/images/UI/rankking.png";
        ranking.style.position = "absolute";
        ranking.style.left = "68vw";
        ranking.style.top = "80%";
        ranking.style.transform = "translateY(-50%)";
        ranking.style.display = "flex";
        ranking.style.alignItems = "center";
        ranking.style.zIndex = "100";
        ranking.style.height = "auto";
        ranking.id = "ranking";
        document.body.appendChild(ranking);

        // 결과 저장
        const elapsed = gameStartTime ? Date.now() - gameStartTime : 0;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const ms = Math.floor((elapsed % 1000) / 10);
        const playTimeText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

        saveResult({
            studentNumber: currentStudentNumber,
            studentName: currentStudentName,
            attempts: playingCount,
            playTime: playTimeText,
            rawTime: elapsed
        });

        ranking.addEventListener("click", () => {
            document.body.innerHTML = "";
            document.body.style.backgroundImage = `url("accesses/images/background/ranking.png")`;
            const refreshBtn = document.createElement("div");
            refreshBtn.id = "refresh-txt";
            let timeLeft = 60;
            refreshBtn.textContent = `${timeLeft}초 뒤 메뉴 화면으로 이동됩니다. (Ctrl + R 으로 바로가기)`;
            refreshBtn.style.position = "absolute";
            refreshBtn.style.bottom = "1vh";
            refreshBtn.style.left = "1vw";
            refreshBtn.style.fontWeight = "bold";
            refreshBtn.style.fontSize = "2vw";
            refreshBtn.style.alignItems = "center";
            refreshBtn.style.color = "black";
            refreshBtn.style.textAlign = "center";
            document.body.appendChild(refreshBtn);

            const refreshInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(refreshInterval);
                    location.reload();
                } else {
                    refreshBtn.textContent = `${timeLeft} 초 뒤 메뉴 화면으로 이동됩니다. (Ctrl + R 으로 바로가기)`;
                }
            }, 1000);
            // 데이터 컨테이너 (사용자가 꾸밀 수 있게 최소한의 구조만 제공)
            const recentContainer = document.createElement("div");
            recentContainer.id = "recent-list";
            document.body.appendChild(recentContainer);

            const topContainer = document.createElement("div");
            topContainer.id = "top-list";
            document.body.appendChild(topContainer);

            const row = document.createElement("div");
            row.className = "recent-item";
            row.innerHTML = `<span>학번</span> <span>이름</span> <span>도전 횟수</span> <span>걸린 시간</span>`;
            recentContainer.appendChild(row);

            getAllRankings((data) => {
                // 최근 기록
                const recentData = [...data].sort((a, b) => b.timestamp - a.timestamp);
                recentData.forEach(item => {
                    const row = document.createElement("div");
                    row.className = "recent-item";
                    row.innerHTML = `<span>${item.studentNumber}</span> <span>${item.studentName}</span> <span>${item.attempts}번</span> <span>${item.playTime}</span>`;
                    recentContainer.appendChild(row);
                });

                // TOP 3
                const rawTop3 = [...data].sort((a, b) => {
                    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
                    return a.rawTime - b.rawTime;
                }).slice(0, 3);

                // 배치 순서: 3등(왼쪽), 1등(가운데), 2등(오른쪽)
                const podiumData = [];
                if (rawTop3[2]) podiumData.push({ ...rawTop3[2], rank: 3 });
                if (rawTop3[0]) podiumData.push({ ...rawTop3[0], rank: 1 });
                if (rawTop3[1]) podiumData.push({ ...rawTop3[1], rank: 2 });

                podiumData.forEach((item) => {
                    const box = document.createElement("div");
                    box.className = `top-item rank-${item.rank}`;
                    box.innerHTML = `
                        <div class="top-main">${item.studentNumber} ${item.studentName}</div>
                        <div class="top-sub">${item.attempts}번 (${item.playTime})</div>
                    `;
                    topContainer.appendChild(box);
                });
            });
        });

    }

    function defineLlisteners() {

        const volumeRange = document.querySelector('input[type="range"]');
        const rangeText = document.getElementById("range");

        const savedVolume = loadVolumeState();
        volumeRange.value = savedVolume;
        rangeText.textContent = `${savedVolume}%`;

        volumeRange.addEventListener("input", (event) => {
            const rangeValue = event.target.value;
            rangeText.textContent = `${rangeValue}%`;
            saveVolumeState(rangeValue);
            bgm.volume = (loadVolumeState() / 100);
        });

        volumeRange.addEventListener("wheel", (event) => {
            event.preventDefault();
            const step = 5;
            let newValue = parseInt(volumeRange.value, 10);

            if (event.deltaY < 0) {
                newValue = Math.min(newValue + step, 100);
            } else {
                newValue = Math.max(newValue - step, 0);
            }
            volumeRange.value = newValue;
            rangeText.textContent = `${newValue}%`;
            saveVolumeState(newValue);
            bgm.volume = newValue / 100;
        });

        document.getElementById("setting").addEventListener("click", (event) => {
            addShrinkGrowAnimation(event.target);
            document.getElementById("setting-window").style.display = "flex";
            setTimeout(() => {
                document.getElementById("setting-window").style.opacity = "1";
            }, 100);
        });

        document.getElementById("close").addEventListener("click", (event) => {
            addShrinkGrowAnimation(event.target);
            const settingWindow = document.getElementById("setting-window");
            setTimeout(() => {
                settingWindow.style.opacity = "0";
                setTimeout(() => {
                    settingWindow.style.display = "none";
                }, 300);
            }, 200);
        });

        document.getElementById("exit").addEventListener("click", (event) => {
            addShrinkGrowAnimation(event.target);
            setTimeout(() => {
                if (confirm("게임을 종료할까요?")) {
                    window.close();
                }
            }, 200);
        });

        document.getElementById("refresh").addEventListener("click", (event) => {
            addShrinkGrowAnimation(event.target);
            setTimeout(() => {
                if (confirm("게임을 재시작할까요?")) {
                    console.log(isFullscreen)
                    window.location.reload();
                }
            }, 200);
        });

        document.getElementById("bgmCheckbox").addEventListener("click", (event) => {
            addShrinkGrowAnimation(event.target);
            const checkbox = document.getElementById("bgmCheckbox");
            if (checkbox.src.includes("checkbox01.png")) {
                checkbox.src = "accesses/images/UI/checkbox02.png";
                bgm.play();
                saveBgmState(true);
            } else {
                checkbox.src = "accesses/images/UI/checkbox01.png";
                bgm.pause();
                saveBgmState(false);
            }
        });

        document.getElementById("fullscreenCheckbox").addEventListener("click", (event) => {
            addShrinkGrowAnimation(event.target);
            const checkbox = document.getElementById("fullscreenCheckbox");
            if (!isFullscreen) {
                checkbox.src = "accesses/images/UI/checkbox02.png";
            } else {
                checkbox.src = "accesses/images/UI/checkbox01.png";
            }
        });
    }

    document.addEventListener("keydown", (event) => {
 if (event.code === "Escape") {
            if (isFullscreen) {
            } else {
                if (confirm("게임을 종료할까요?")) {
                    window.close();
                }
            }
            event.preventDefault();
        } else if (event.ctrlKey && event.key === 'r') {
            if (confirm("게임을 재시작할까요?")) {
                window.location.reload();
            }
            event.preventDefault();
        }
    });

});
