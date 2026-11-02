/* One current, verified release list replaces accumulated sample-era entries. */
(() => {
  let canonical = [];
  const render = () => {
    const list = document.querySelector('#patchView .patch-list');
    if (!list) return;
    const notes = [
      ['2026-11-02', '공사일보 알림', '새 공사일보 휴대폰 알림', '새 공사일보 저장 완료 후 알림을 받고 해당 일보로 이동할 수 있습니다. 본판 설정 또는 MIN WORKS+ 상단 알림에서 기기별 수신과 현장을 선택하세요. 본판·플러스 중 마지막으로 켠 앱에서 받으며, 수정·임시저장에는 발송하지 않습니다. 아이폰은 홈 화면에 설치한 앱에서 알림을 허용해 주세요.'],
      ['2026-11-02', '저장공간', '저장소 구매·보관 가이드', '사용량과 자료 정리에 접이식 저장소 안내를 추가했습니다. 예상 보관 용량, 일시 구매 NAS·외장하드·클라우드 가격과 판매 링크를 확인할 수 있습니다. 자동 전송은 도입 계획으로 구분하며 현재 저장·내보내기 기능은 유지합니다.'],
      ['2026-11-02', '협력업체', '업체 등록 작성 안내', '업체 목록 상단에 사업자등록증의 정식 업체명과 연락처·주소 등 상세정보 작성 안내를 추가했습니다.'],
      ['2026-11-02', '협력업체', '업체 4열 목록·상단 상세정보', 'PC 업체 카드를 4열로 정리하고 20개씩 페이지로 나눴습니다. 선택한 업체 정보는 목록 위 오른쪽에 표시하며 휴대폰에서는 화면 너비에 맞춰 배치합니다. 검색·지역 선택 시 첫 페이지부터 표시하고 메인 스크롤 하나로 이동합니다.'],
      ['2026-11-02', '협력업체', '협력업체 화면 스크롤 통합', '업체 화면과 목록에 각각 생기던 안쪽 스크롤을 제거했습니다. 내용과 검색 결과에 맞춰 화면 길이를 자동 조정하고 메인 스크롤 하나로 이동합니다. 업체 선택 후 상세정보 이동과 수정창 위치도 PC·태블릿·모바일에 맞췄습니다.'],
      ['2026-11-02', 'Q&A', 'Gemini 자동답변 연결', '버그·개선 Q&A에 사용법과 업데이트 계획을 묻는 자동답변창을 추가했습니다. 의견 등록 후 AI 답변 받기를 선택할 수 있으며 AI 답변과 개발자 답변을 구분합니다. 관리자 계획과 직접 답변을 보호하고, 이용 한도·응답 실패 시 다시 요청할 수 있도록 안내합니다. 패치노트 하단의 Gemini 예정 안내는 제거했습니다.'],
      ['2026-11-02', '사용법', '사용법 화면 오류 수정·안내 최신화', 'MIN WORKS+ 안내가 좁은 칸에 갇혀 세로로 깨지던 오류를 수정했습니다. PC·모바일의 글자 크기와 카드 너비를 정리하고 현장서류·공정표·협력업체·Q&A 및 기기 연결 안내를 현재 메뉴에 맞췄습니다. 패치노트는 적용 내역을 최신순으로 정리하고 예정 기능을 별도로 표시합니다.'],
      ['2026-10-30', '협력업체', '지역별 협력업체 연락망', '이슈 관리 위에 협력업체 메뉴를 추가했습니다. 지도·공종·업체명으로 연락처를 찾고, 로그인한 직원이 업체 정보를 등록·수정할 수 있습니다. PC·태블릿·휴대폰 화면에 맞춰 배치하고 직원 공용 자료로 저장합니다.'],
      ['2026-10-26', '현장서류', '공정표 작성·위험성평가 인원 정보 개선', '현장서류의 TBM 일지 아래에 공정표 작성을 연결했습니다. 주요공정과 일정 구간의 작업명을 작성하고 A3·A4로 출력할 수 있습니다. 위험성평가 작성자·직급과 결재 인원 표시를 정리하고 작성자 직접 입력을 지원합니다.'],
      ['2026-10-26', '화면', '자료 동기화 후 오프닝 반복 수정', '회사 자료 동기화로 화면이 다시 열릴 때 오프닝이 반복 재생되는 문제를 수정했습니다. 사용자가 설정한 오프닝 켜기·끄기는 유지됩니다.'],
      ['2026-09-22', 'MIN WORKS', '공사일보·화면·공유 정리', '공사일보 현장 필터를 전체 현장과 현장별 선택으로 정리하고 새 현장을 자동 반영합니다. PC·모바일 화면 선택을 간소화하고 휴대폰·폴드 화면을 너비에 맞춰 자동 배치합니다. 링크 공유 미리보기 정보와 로그아웃 문구를 정리했습니다.'],
      ['2026-09-22', 'Q&A', '버그·개선 의견 접수', '왼쪽 버그·개선 Q&A 메뉴에서 직원 의견을 등록하고 관리자가 다음 업데이트 계획과 개발자 답변을 남길 수 있습니다.'],
      ['2026-09-22', '현장 이슈', '담당자와 메뉴 정리', '이슈 담당자 선택을 로그인 직원·등록 직원·현장 담당 정보에 맞춰 갱신했습니다. 홈 이슈 요약의 잘못 표시되던 아이콘 글자를 제거하고, 단독 위험성평가 샘플 메뉴와 화면을 정리했습니다. 위험성평가표는 현장서류에서 계속 작성할 수 있습니다.'],
      ['2026-09-22', 'MIN WORKS+', '공사일보 조회 개선', '민웍스+에서 현장과 사진을 좌우로 넘겨 보고, 사진 1장 또는 해당 일보의 사진 전체를 내려받을 수 있습니다.'],
      ['2026-09-21', '현장서류', '현장서류 본판 통합', 'TBM 일지, 사진대지PRO_V1, 위험성평가표, 교육서류, 작업허가서, 산업안전보건관리비를 현장서류에 연결했습니다. 현장정보 연동과 인쇄·PDF 화면을 정리했습니다.']
    ];
    notes.sort((a, b) => b[0].localeCompare(a[0]));
    canonical = notes.map(([date, version, title, body]) => {
      const article = document.createElement('article');
      article.className = 'patch-item';
      const time = document.createElement('time');
      time.dateTime = date;
      time.textContent = date.replaceAll('-', '. ');
      const content = document.createElement('div');
      const badge = document.createElement('span'); badge.textContent = version;
      const heading = document.createElement('h3'); heading.textContent = title;
      const paragraph = document.createElement('p'); paragraph.textContent = body;
      content.append(badge, heading, paragraph);
      article.append(time, content);
      return article;
    });
    list.replaceChildren(...canonical);
    const caption = document.querySelector('#patchView .patch-title small');
    if (caption) caption.textContent = '본판 적용 내역 · 최신순 · 2026. 11. 02 기준';
    // Older modules still append their historical test notes during startup.
    // Keep this release list authoritative even when they run after DOMContentLoaded.
    new MutationObserver(() => {
      if (list.children.length !== canonical.length || canonical.some((item, index) => list.children[index] !== item)) {
        list.replaceChildren(...canonical);
      }
    }).observe(list, { childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
