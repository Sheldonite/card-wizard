/* Frame ornaments use a 100 x 140 die. Open centers keep the portrait and its edition visible. */
(() => {
  'use strict';
  const frames = {
    daybreak_minnow: `
      <g fill="none" stroke="#1b5265" stroke-width="8"><path d="M48 8Q5-4 6 24T5 82Q0 111 10 129Q23 140 50 135Q95 144 95 115L92 77Q99 46 94 20Q91 4 52 8Z"/></g>
      <path d="M48 8Q5-4 6 24T5 82Q0 111 10 129Q23 140 50 135Q95 144 95 115L92 77Q99 46 94 20Q91 4 52 8Z" fill="none" stroke="#71cbc9" stroke-width="4"/>
      <path class="frame-waterline" d="M8 13Q5 29 8 43M5 79Q8 67 6 57M94 38Q97 22 90 13M92 100Q96 116 91 126" fill="none" stroke="#e1fff2" stroke-width="1.6"/>
      <path d="M32 6Q49 22 68 6Q49 1 32 6Z" fill="#2a7282" stroke="#cbeccc"/>
      <path d="M40 9a10 10 0 0 1 20 0Z" fill="#ffc269" stroke="#935638"/><path d="M39 10Q46 14 51 11T63 10" fill="none" stroke="#e6fff2"/>
      <g fill="#a9b7a2" stroke="#496c70"><ellipse cx="8" cy="116" rx="3" ry="5"/><ellipse cx="11" cy="124" rx="3.8" ry="2.5"/><ellipse cx="90" cy="20" rx="2.3" ry="4"/></g>`,
    tin_echo: `
      <path d="M3 137V12L12 3H88L97 12V137Z" fill="none" stroke="#414c51" stroke-width="5"/>
      <path d="M5 134V14L15 5H85L95 14V134" fill="none" stroke="#c5d5d2" stroke-width="2"/>
      <g class="frame-bell"><path d="M12 3Q12 13 20 15L15 20 5 10Q9 8 9 3ZM88 3Q88 13 80 15L85 20 95 10Q91 8 91 3Z" fill="#a0afae" stroke="#475255" stroke-width="1.5"/>
      <g fill="#f1d296" stroke="#49535b"><circle cx="17" cy="18" r="2.2"/><circle cx="83" cy="18" r="2.2"/></g></g>
      <path d="M45 2v5q0 5 5 5t5-5V2M50 12v7" fill="none" stroke="#293338" stroke-width="5"/><path d="M45 2v5q0 5 5 5t5-5V2M50 12v6" fill="none" stroke="#e3e2c9" stroke-width="2.6"/>
      <g fill="#edf2d7" stroke="#445963"><circle cx="5" cy="37" r="2.3"/><circle cx="95" cy="37" r="2.3"/><circle cx="5" cy="112" r="2.3"/><circle cx="95" cy="112" r="2.3"/></g>`,
    copper_plover: `
      <rect x="3" y="3" width="94" height="134" rx="9" fill="none" stroke="#833f35" stroke-width="5"/>
      <rect x="5" y="5" width="90" height="130" rx="7" fill="none" stroke="#f7b17b" stroke-width="1.5"/>
      <path d="M5 91Q0 56 5 26Q9 2 33 2Q31 10 22 17L24 10Q18 22 11 29L12 22Q6 48 5 91Z" fill="#cc7964" stroke="#673935"/>
      <path d="M5 88Q4 34 11 19Q17 9 30 4M8 34 13 23M9 23 18 16" fill="none" stroke="#ffe1a6" stroke-width="1.5"/>
      <path d="M66 135Q78 128 82 115L81 104 97 109 96 132 86 138Z" fill="#a45d43" stroke="#5c3531"/>
      <g class="frame-stamp"><circle cx="87" cy="125" r="8" fill="#d68d5e" stroke="#703e33" stroke-width="2"/><circle cx="87" cy="125" r="5.9" fill="none" stroke="#ffce8c"/>
      <path d="m84 128 6-7-1 5-5 2Z" fill="#93513b"/></g>`,
    linen_sprite: `
      <path d="M3 8H97M3 132H97M6 3v134M94 3v134" fill="none" stroke="#825e43" stroke-width="5"/>
      <g fill="none" stroke="#e8d9a6" stroke-width="1.4"><path d="M9 6v127m3-125v122m76-122v122m3-124v127"/><path d="M5 13 14 8M5 19l9-5M5 25l9-5M86 118l10-5M86 124l10-5M86 130l10-5"/></g>
      <path class="frame-thread" d="M16 6Q22 15 43 7T83 9" fill="none" stroke="#749d9d" stroke-width="2"/>
      <g transform="translate(59 8) rotate(12)"><rect x="-10" y="-4" width="20" height="8" rx="2" fill="#e8d6ae" stroke="#7a6355"/><path d="M-10-5v10M10-5v10" stroke="#b28468" stroke-width="3"/><path d="m-6-3 2 6m2-6 2 6m2-6 2 6" stroke="#b5a07a"/></g>
      <path d="M90 125q-7 9-15 4t-20 5" fill="none" stroke="#9dd3cf" stroke-width="1.8"/>`,
    fox_in_ink: `
      <path d="M3 137V12Q4 3 14 3H96V134Q88 137 3 137Z" fill="none" stroke="#402838" stroke-width="6"/>
      <path d="M5 135V13Q5 6 15 6H94" fill="none" stroke="#d39c71" stroke-width="1.5"/>
      <path d="M14 3Q39 4 54 9Q59 13 67 6Q53 19 41 14L43 17Q27 14 14 3Z" fill="#bf674a" stroke="#623546"/><path d="M54 9q7 2 13-3-4 7-13 8l3-3Z" fill="#ecd4b1"/>
      <g transform="translate(87 20) rotate(22)"><g class="frame-ink-brush"><path d="M-1 11 1-18 4-20 2 10Z" fill="#e0b776" stroke="#663f32"/><path d="m-2 10 5 1-5 12-2-5Z" fill="#59223a"/></g></g>
      <path d="m82 32 10 2-1 4 4 5-3 9-12-2-1-10 4-4Z" fill="#341a30" stroke="#b27d77" stroke-width="1.5"/>
      <path d="M5 44v48" fill="none" stroke="#321827" stroke-width="6"/>`,
    second_shadow: `
      <path d="M16 2H96V125L84 137H4V77L12 70 4 63V13Z" fill="none" stroke="#292b41" stroke-width="5"/>
      <path d="M17 5H93V124L82 134H7V78L15 70 7 61V15Z" fill="none" stroke="#a5adc4" stroke-width="1.6"/>
      <path d="M21 8H89V120L78 130H12V82L22 70 12 56V18Z" fill="none" stroke="#65577f" stroke-width="2.3"/>
      <path class="frame-shadow-notch" d="M3 60 17 70 3 81 7 71Z" fill="#c4bdd8" stroke="#453d5d"/>
      <path d="M65 5q2 6 8 7l-3 3 5 3 2 3 7-2-7-5q1-6 8-9Z" fill="#302b41" stroke="#9998ae"/><path d="M73 3q1 6 6 8l-2 2 4 3 1 3 8-2-6-6q0-4 5-8Z" fill="#625a71" stroke="#d0cad5"/>`
  };
  function baseId(item) {
    if (item?.kind !== 'familiar') return '';
    const id = item.baseId || item.id;
    return Object.hasOwn(frames, id) ? id : '';
  }
  function attribute(item) {
    const id = baseId(item);
    return id ? ' data-familiar-frame="' + id + '"' : '';
  }
  function inkGauge(item) {
    const filled = Math.min(12, Math.max(0, (Number(item.stackAmount) || 4) - 4));
    return Array.from({length:12}, (_, i) =>
      '<rect class="frame-ink-mark' + (i < filled ? ' charged' : '') + '" x="2.3" y="' + (89 - i * 4) + '" width="5.4" height="2.6" rx=".6"/>'
    ).join('');
  }
  function ornament(item) {
    const id = baseId(item);
    return id ? '<svg class="cw-familiar-trim" aria-hidden="true" focusable="false" viewBox="0 0 100 140" preserveAspectRatio="none">' + frames[id] + (id === 'fox_in_ink' ? inkGauge(item) : '') + '</svg>' : '';
  }
  window.CWFamiliarFrames = {attribute, ornament};
})();
