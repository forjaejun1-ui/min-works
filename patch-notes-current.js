/* One current, verified release list replaces accumulated sample-era entries. */
(() => {
  const render = () => {
    const list = document.querySelector('#patchView .patch-list');
    if (!list) return;
    const notes = [
      ['2026-09-22', 'MIN WORKS', '공사일보·화면·공유 정리', '공사일보 현장 필터를 전체 현장과 현장별 선택으로 정리하고 새 현장을 자동 반영합니다. PC·모바일 화면 선택을 간소화하고 휴대폰·폴드 화면을 너비에 맞춰 자동 배치합니다. 링크 공유 미리보기 정보와 로그아웃 문구를 정리했습니다.'],
      ['2026-09-22', 'Q&A', '버그·개선 의견 접수', '패치노트에서 직원 의견을 등록하고 관리자가 다음 업데이트 계획과 개발자 답변을 남길 수 있습니다. Gemini AI 자동 답변은 추후 패치 예정입니다.'],
      ['2026-09-22', '현장 이슈', '담당자와 메뉴 정리', '이슈 담당자 선택을 로그인 직원·등록 직원·현장 담당 정보에 맞춰 갱신했습니다. 홈 이슈 요약의 잘못 표시되던 아이콘 글자를 제거하고, 단독 위험성평가 샘플 메뉴와 화면을 정리했습니다. 위험성평가표는 현장서류에서 계속 작성할 수 있습니다.'],
      ['2026-09-22', 'MIN WORKS+', '공사일보 조회 개선', '민웍스+에서 현장과 사진을 좌우로 넘겨 보고, 사진 1장 또는 해당 일보의 사진 전체를 내려받을 수 있습니다.'],
      ['2026-09-21', '현장서류', '현장서류 본판 통합', 'TBM 일지, 사진대지PRO_V1, 위험성평가표, 교육서류, 작업허가서, 산업안전보건관리비를 현장서류에 연결했습니다. 현장정보 연동과 인쇄·PDF 화면을 정리했습니다.']
    ];
    list.replaceChildren(...notes.map(([date, version, title, body], index) => {
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
    }));
    document.querySelector('#patchView .patch-title small').textContent = '현재 적용된 주요 변경사항';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
