/* Current production guide. Presentation only; never reads or writes company data. */
(() => {
  const cards = [
    ['home', '홈', '진행 현장, 오늘 보고와 미처리 이슈를 확인하고 해당 업무로 이동합니다.', 'dashboard'],
    ['apartment', '현장관리', '진행 중·완료 현장을 구분해 보고 담당자, 공정률과 최근 일보를 확인합니다.', 'sites'],
    ['edit_note', '공사일보', '현장·날짜와 공정별 인원·작업내용, 사진·특이사항을 입력합니다. 현장별로 찾기에서 현장을 선택하면 해당 현장 일보만 표시됩니다.', 'daily'],
    ['folder_open', '현장서류', 'TBM 일지, 공정표 작성, 사진대지PRO_V1, 위험성평가표, 교육서류와 작업허가서를 엽니다. 필요한 서류를 작성하고 인쇄·PDF로 출력하세요.', 'documents'],
    ['group', '협력업체', '지도에서 지역을 고르거나 업체명·공종으로 검색합니다. 업체를 선택하면 상세 연락처가 표시됩니다. 직원이 등록·수정한 정보는 공유 저장됩니다.', 'vendors'],
    ['report_problem', '이슈 관리', '현장 문제와 긴급도를 기록하고 댓글·수정·완료 처리로 진행 상황을 관리합니다. 등록 전에 작성자 정보를 확인하세요.', 'issues'],
    ['settings', '설정·앱 설치', '앱 설치 안내와 내 화면 설정을 확인합니다. 상단 PC·모바일 보기와 현재 화면 너비에 따라 배치가 달라집니다.', 'settings'],
    ['forum', '버그·개선 Q&A', 'Gemini에 사용법과 개선 계획을 질문하거나 오류·개선 의견을 등록합니다. AI 답변과 개발자 답변은 구분해서 표시하며, 등록된 계획이 없으면 확인되지 않은 상태로 안내합니다.', 'qa'],
    ['new_releases', '패치노트', '본판에 적용된 주요 변경사항을 최신순으로 확인합니다. 준비 중인 기능은 적용 내역과 구분해 안내합니다.', 'patch'],
    ['smartphone', 'MIN WORKS+ · 전 직원 조회용', '본판을 설치하지 않아도 공사일보를 조회할 수 있습니다. 플러스 승인을 받은 후 오늘·전일 일보를 확인하고 현장과 사진을 좌우로 넘겨 보세요.', 'plus']
  ];
  const questions = [
    ['공사일보가 올라오면 휴대폰 알림을 받을 수 있나요?', ['본판 설정 → 공사일보 알림 또는 MIN WORKS+ 상단 종 모양을 누른 뒤 이 앱에서 알림 켜기를 선택하고 기기 알림을 허용하세요. 전체 현장 또는 선택한 현장만 받을 수 있습니다.', '아이폰은 iOS 16.4 이상에서 Safari → 공유 → 홈 화면에 추가 후 설치한 앱을 열어 설정하세요. 갤럭시는 Chrome 또는 알림을 지원하는 브라우저를 이용합니다. 테스트 알림으로 수신을 확인하세요.', '본판·플러스 중 계정에서 마지막으로 알림을 켠 앱으로 받습니다. 기기를 바꾸거나 다시 로그인하면 알림 설정을 확인하세요. 새 일보 저장 완료에만 발송하며 수정·임시저장은 제외합니다. 기기 알림 차단·집중 모드·네트워크 상태에 따라 늦게 도착할 수 있습니다.']],
    ['처음 접속하거나 기기를 바꾸면?', ['처음 사용하는 직원은 관리자가 발급한 접속코드로 이름·부서·직급을 입력해 등록하고 승인을 받으세요. 본판과 MIN WORKS+의 승인 상태는 각각 관리됩니다.', '이미 등록한 직원은 새로 등록하지 말고 기존 직원 기기 연결을 선택하세요. 관리자가 발급한 본인용 8자리 연결코드를 입력합니다. 브라우저와 설치 앱은 다시 연결이 필요할 수 있습니다.']],
    ['공사일보 작성·현장별 조회는?', ['공사일보 → 공사일보 작성하기에서 현장·날짜, 공정별 인원과 작업내용을 입력하고 사진·특이사항을 추가한 뒤 등록합니다. 사진 없이도 등록할 수 있습니다.', '목록 상단 현장별로 찾기에서 현장을 고르면 해당 현장 일보만 표시됩니다. 전체 현장을 누르면 전체 목록으로 돌아갑니다. 저장 오류가 나오면 입력 내용을 보관하고 연결 상태를 확인하세요.']],
    ['공사일보를 출력하려면?', ['일보의 다운로드 버튼 또는 현장별 통합 PDF 내보내기를 이용하세요. 출력할 현장과 날짜, 사진 포함 여부를 확인한 뒤 저장합니다.']],
    ['현장서류와 공정표는 어디에 있나요?', ['왼쪽 현장서류를 펼쳐 사용할 서류를 선택하세요. 위험성평가표는 현장서류 하위에 있습니다.', '공정표 작성에서 현장명·기간·주요공정을 입력하고 색칠된 일정 구간에 작업명을 적습니다. A3·A4 출력 전 미리보기에서 한 장 배치와 글자 크기를 확인하세요.']],
    ['협력업체 검색과 수정은?', ['협력업체에서 지도 지역·공종·검색어로 업체를 찾고 업체 카드를 선택해 정보를 확인하세요. 업체 등록 또는 수정 후 공유 저장 완료 표시를 확인합니다.', '수정한 업체 정보는 직원 공용입니다. 즐겨찾기는 개인별·기기별로 유지됩니다. 자료 가져오기는 관리자에게만 표시됩니다.']],
    ['MIN WORKS+에서는 무엇을 볼 수 있나요?', ['오늘·전일 버튼으로 일보를 선택하고 좌우 스와이프 또는 화살표로 다른 현장을 봅니다. 사진을 누르면 크게 열리며 사진도 좌우로 넘길 수 있습니다.', '사진 다운로드에서 현재 사진 또는 해당 일보의 전체 사진을 선택합니다. 이전 날짜의 일보는 본판 공사일보에서 확인하세요.']],
    ['앱 아이콘은 어떻게 설치하나요?', ['설정의 앱 설치 안내를 먼저 확인하세요. 갤럭시는 Chrome의 앱 설치 메뉴를, 아이폰은 Safari의 공유 → 홈 화면에 추가를 이용합니다. 카카오톡 안에서 열었다면 외부 브라우저로 다시 열어주세요.', 'MIN WORKS와 MIN WORKS+는 각각 설치합니다. 설치한 아이콘에서 연결 화면이 다시 나오면 기존 직원 기기 연결로 접속하세요.']],
    ['PC·모바일 또는 폴드 화면이 맞지 않아요.', ['상단에서 PC·모바일 보기를 선택할 수 있습니다. 모바일 화면은 현재 너비에 맞춰 배치되고 폴드를 접거나 펼쳐도 다시 맞춰집니다.', '화면이 겹치거나 이전 모습이 남아 있으면 작성 중인 내용을 저장한 뒤 앱을 다시 열거나 새로고침하세요.']],
    ['다른 직원과 자료가 다르게 보여요.', ['인터넷 연결과 화면의 저장·동기화 상태를 확인하세요. 저장 오류가 표시되면 공유 완료된 상태가 아닙니다.', '입력 내용을 보관한 뒤 새로고침하고 다시 확인하세요. 계속 다르면 사용 기기와 오류 화면을 버그·개선 Q&A에 남겨주세요.']],
    ['버그 신고와 AI 답변은 어디서 확인하나요?', ['왼쪽 패치노트 아래 버그·개선 Q&A의 Gemini 자동답변에서 질문합니다. 정식 의견 접수에는 사용 기기, 문제가 발생한 메뉴와 순서를 함께 적어주세요. 등록 후 자동답변을 받을지 선택할 수 있습니다.', 'AI는 사용법과 관리자가 입력한 업데이트 계획을 참고합니다. AI 답변입니다라는 표시를 확인하고, 개발자 답변이 있으면 우선 참고하세요. 무료 이용 한도에 도달하면 잠시 후 다시 요청하세요.', '질문과 공개용 업데이트 계획은 Google Gemini로 전송됩니다. 무료 서비스 입력·답변은 Google 제품 개선에 사용될 수 있으므로 개인정보·기밀을 적지 마세요.']]
  ];
  window.MIN_WORKS_RENDER_GUIDE = () => {
    const view = document.getElementById('helpView');
    if (!view) return;
    view.querySelector('.help-hero h2').textContent = '민웍스 사용법';
    view.querySelector('.help-hero h2 + p').textContent = '현재 본판 메뉴와 실제 사용 순서로 안내합니다. · 2026. 11. 02 업데이트';
    view.querySelector('.help-start').innerHTML = '<div><span class="material-symbols-rounded" aria-hidden="true">rocket_launch</span><div><b>MIN WORKS · 공무팀·시공팀 업무용</b><p>현장 선택 → 공사일보 작성 → 등록 결과 확인 순서로 시작하세요. 전 직원의 일보 조회는 MIN WORKS+를 이용하세요.</p></div></div>';
    const grid = view.querySelector('.help-grid');
    grid.innerHTML = cards.map(([icon,title,description,target],index) => `<article class="help-card static" ${target === 'plus' ? 'id="readerHelp"' : ''}><span class="material-symbols-rounded" aria-hidden="true">${icon}</span><div><small>${String(index+1).padStart(2,'0')}</small><h3>${title}</h3><p>${description}</p>${target === 'plus' ? '<a class="guide-open" href="https://forjaejun1-ui.github.io/min-works-plus/" target="_blank" rel="noopener">MIN WORKS+ 열기 ↗</a>' : `<button type="button" class="guide-open" data-guide-target="${target}">${title} 열기 →</button>`}</div></article>`).join('');
    grid.querySelectorAll('[data-guide-target]').forEach(button => button.addEventListener('click', () => window.showView(button.dataset.guideTarget)));
    // Retain one authoritative guide if a legacy module appends instructions on login.
    const canonical = [...grid.children];
    new MutationObserver(() => {
      if (grid.children.length !== canonical.length || canonical.some((card,index) => grid.children[index] !== card)) grid.replaceChildren(...canonical);
    }).observe(grid, {childList:true});
    view.querySelector('.help-details').innerHTML = '<div class="panel-head"><div><p class="eyebrow">STEP BY STEP</p><h2>자주 묻는 사용법</h2></div></div>' + questions.map(([title,paragraphs],index) => `<details ${index === 0 ? 'open' : ''}><summary><span>${index+1}</span><b>${title}</b><i class="material-symbols-rounded" aria-hidden="true">expand_more</i></summary><div>${paragraphs.map(text => `<p>${text}</p>`).join('')}</div></details>`).join('');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.MIN_WORKS_RENDER_GUIDE, {once:true});
  else window.MIN_WORKS_RENDER_GUIDE();
})();
