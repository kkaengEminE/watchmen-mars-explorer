/* Shared touch controls for Mars and Toga explorers. No external dependencies. */
(function () {
  "use strict";
  window.installMarsMobileControls = function (options) {
    const touchDevice = (typeof matchMedia === "function" && (matchMedia("(any-pointer: coarse)").matches || matchMedia("(pointer: coarse)").matches)) || navigator.maxTouchPoints > 0;
    if (!touchDevice) return { enabled:false, start(){}, sync(){} };
    const {canvas, state, toggleFly, toggleView, jump} = options;
    state.mobileAxis = { x:0, y:0 };
    state.mobileSprint = false;
    const shell = document.createElement("div");
    shell.className = "mars-mobile";
    shell.setAttribute("aria-label", "모바일 탐험 조작");
    shell.innerHTML = '<div class="mars-joy-zone" aria-label="이동 조이스틱"><div class="mars-joy-ring"></div><div class="mars-joy-knob"></div></div>'+
      '<div class="mars-actions">'+
      '<button type="button" class="mars-action" data-act="view" aria-label="시점 전환"><strong>◉</strong>시점</button>'+
      '<button type="button" class="mars-action" data-act="fly" aria-label="비행 전환" aria-pressed="false"><strong>✦</strong>비행</button>'+
      '<button type="button" class="mars-action" data-act="up" aria-label="점프 또는 상승"><strong>↑</strong><span class="mars-up-label">점프</span></button>'+
      '<button type="button" class="mars-action" data-act="down" aria-label="하강" disabled><strong>↓</strong>하강</button>'+
      '</div><div class="mars-mobile-hint">왼쪽 이동 · 오른쪽 화면 드래그로 둘러보기</div>';
    document.body.appendChild(shell);
    const zone=shell.querySelector(".mars-joy-zone"), knob=shell.querySelector(".mars-joy-knob");
    const viewButton=shell.querySelector('[data-act="view"]');
    const flyButton=shell.querySelector('[data-act="fly"]');
    const upButton=shell.querySelector('[data-act="up"]');
    const downButton=shell.querySelector('[data-act="down"]');
    let stickPointer=null, lookPointer=null, lookX=0, lookY=0, lastFly=null;
    function resetStick() {
      stickPointer=null;state.mobileAxis.x=0;state.mobileAxis.y=0;state.mobileSprint=false;
      knob.style.transform="translate(-50%,-50%)";
    }
    function moveStick(e) {
      const b=zone.getBoundingClientRect(), midX=b.left+b.width/2,midY=b.top+b.height/2;
      let x=(e.clientX-midX)/(b.width*.36), y=(midY-e.clientY)/(b.height*.36);
      const len=Math.hypot(x,y);
      if(len>1){x/=len;y/=len}
      if(len<.12){x=0;y=0}
      state.mobileAxis.x=x;state.mobileAxis.y=y;
      state.mobileSprint=len>.94;
      knob.style.transform="translate(calc(-50% + "+(x*b.width*.36)+"px),calc(-50% - "+(y*b.height*.36)+"px))";
    }
    zone.addEventListener("pointerdown",e=>{
      if(!state.started||stickPointer!==null)return;
      e.preventDefault();stickPointer=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e);
    });
    zone.addEventListener("pointermove",e=>{if(e.pointerId===stickPointer){e.preventDefault();moveStick(e)}});
    for(const kind of ["pointerup","pointercancel","lostpointercapture"]) zone.addEventListener(kind,e=>{if(e.pointerId===stickPointer)resetStick()});
    // Drag on the rendered world to orbit the camera; no pointer lock on mobile.
    canvas.addEventListener("pointerdown",e=>{
      if(e.pointerType!=="touch"||!state.started||lookPointer!==null)return;
      e.preventDefault();lookPointer=e.pointerId;lookX=e.clientX;lookY=e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove",e=>{
      if(e.pointerId!==lookPointer)return;
      e.preventDefault();
      const dx=e.clientX-lookX,dy=e.clientY-lookY;lookX=e.clientX;lookY=e.clientY;
      state.yaw-=dx*.0042;
      state.pitch=Math.max(-1.38,Math.min(1.37,state.pitch-dy*.0035));
    });
    for(const kind of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(kind,e=>{if(e.pointerId===lookPointer)lookPointer=null});
    viewButton.addEventListener("click",e=>{e.preventDefault();if(state.started)toggleView()});
    flyButton.addEventListener("click",e=>{e.preventDefault();if(state.started){toggleFly();sync()}});
    function bindHold(button,code,isUp){
      const active=new Set();
      function stop(id){if(!active.has(id))return;active.delete(id);if(active.size===0){state.keys[code]=false;button.classList.remove("held")}}
      button.addEventListener("pointerdown",e=>{
        if(!state.started||button.disabled)return;
        e.preventDefault();button.setPointerCapture(e.pointerId);active.add(e.pointerId);
        button.classList.add("held");
        if(isUp&&!state.fly){jump();state.keys.Space=false}
        else state.keys[code]=true;
      });
      for(const kind of ["pointerup","pointercancel","lostpointercapture"]) button.addEventListener(kind,e=>stop(e.pointerId));
    }
    bindHold(upButton,"Space",true);
    bindHold(downButton,"ShiftLeft",false);
    function sync(){
      if(lastFly===state.fly)return;
      lastFly=state.fly;
      flyButton.setAttribute("aria-pressed",String(state.fly));
      upButton.querySelector(".mars-up-label").textContent=state.fly?"상승":"점프";
      upButton.setAttribute("aria-label",state.fly?"상승":"점프");
      downButton.disabled=!state.fly;
      if(!state.fly)state.keys.ShiftLeft=false;
    }
    function reset(){resetStick();state.keys.Space=false;state.keys.ShiftLeft=false;lookPointer=null}
    window.addEventListener("blur",reset);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)reset()});
    window.addEventListener("orientationchange",reset);
    sync();
    return {
      enabled:true,
      start(){shell.classList.add("active");sync()},
      sync
    };
  };
})();
