/* Frame ornaments use a 100 x 140 die. Open centers keep the portrait and its edition visible. */
(() => {
  'use strict';
  const frames = {
    kettle_hag: `
      <path d="M4 137V23Q4 5 27 5H71Q96 6 96 26V136Z" fill="none" stroke="#383438" stroke-width="6"/><path d="M6 129V23Q6 7 29 7H71Q93 8 93 26" fill="none" stroke="#948b78" stroke-width="1.8"/>
      <path d="M72 5v7q0 8 5 7 4-1 3-5M63 28q5-8 12-10 10 1 16 10" fill="none" stroke="#b9a386" stroke-width="2"/>
      <path d="M61 27h31l-2 11q-3 7-12 7-12 0-15-6Z" fill="#b96842" stroke="#56392f" stroke-width="2"/><path d="M65 31q2 10 8 10" fill="none" stroke="#f3bb79" stroke-width="2"/>
      <g class="frame-kettle-lid"><path d="M59 27q3-4 12-5v-2h8v2q11 1 15 5Z" fill="#d59060" stroke="#56392f" stroke-width="1.5"/><path d="M72 20q3-4 7 0" fill="none" stroke="#e2ab7b" stroke-width="2"/></g>
      <path d="m4 108 6-4M94 81l-5 4M92 94l5-4" fill="none" stroke="#b68e61" stroke-width="2.5"/>`,
    needle_crow: `
      <rect x="3" y="4" width="94" height="132" rx="8" fill="none" stroke="#3e394c" stroke-width="5"/>
      <path d="M3 99Q1 66 2 47q3-21 12-31-2 16-4 24l-2 9 3-2-5 29Z" fill="#9292a2" stroke="#454051"/><path d="M4 90q0-29 8-69" fill="none" stroke="#dbd9d7"/>
      <path d="M67 7q13-10 27 4l-2 10q-15 4-29-9Z" fill="#3b2d40" stroke="#b7a8b8"/><path d="m67 9 4-4m1 7 5-6m2 9 4-7m2 7 4-5" stroke="#855375"/>
      <g fill="none" stroke="#dcd6ce" stroke-width="1.6"><path d="m79 12 11-11m-6 14 12 9M6 129l16 5M90 129l3-24"/><ellipse cx="92" cy="109" rx="1" ry="2.4"/></g>
      <path class="frame-needle-thread" d="M90 110q-10-7-5-13t7 2q6 11-2 20t-10 15q-4 3-13 1" fill="none" stroke="#e56a7b" stroke-width="2"/>`,
    amber_magpie: `
      <path d="M3 135V19L14 5H80L96 16V132L88 137H11Z" fill="none" stroke="#76502d" stroke-width="6"/><path d="M6 129V20L16 7H78L93 18V127" fill="none" stroke="#f1c575" stroke-width="2"/>
      <g class="frame-magpie-clasp"><path d="M39 4q13-3 22 0l8 9q-10-2-20 6l5-9q-8 1-15-6Z" fill="#e8b862" stroke="#765536" stroke-width="1.7"/><path d="M55 9 67 11l-10-5" fill="#ffe6a5"/></g>
      <path d="M10 123q5-7 13-4l4 8-7 7-10-3Z" fill="#e5a346" stroke="#944f2b" stroke-width="2"/><path d="m13 124 8-3 3 6-5 4Z" fill="#ffcb71"/>
      <path d="M37 131h32l-6 5H40Z" fill="#3b2728" stroke="#d5a360" stroke-width="1.5"/>`,
    marmalade_bat: `
      <rect x="3" y="4" width="94" height="132" rx="10" fill="none" stroke="#774736" stroke-width="5"/>
      <path d="M4 97q4-36 0-69 7 14 14 13-6 11-4 18-7 4-10 38Zm92 0q-4-36 0-69-7 14-14 13 6 11 4 18 7 4 10 38Z" fill="#bb753b" stroke="#724638" stroke-width="1.4"/>
      <path d="M4 33q3 22 4 33m88-33q-3 22-4 33" stroke="#ebad5d" fill="none"/>
      <g class="frame-jam-jar"><path d="M73 5h17v6l3 3v16q-2 4-12 4t-10-4V14l3-3Z" fill="#f7d7a0" stroke="#845338" stroke-width="1.5"/><path d="M73 19q5 2 9 0t8-1v11q-7 4-17 0Z" fill="#dd8a2f"/><path d="M72 4h19v5H72Z" fill="#ba7750" stroke="#694335"/><path d="M75 15v11" stroke="#fff2c9" stroke-width="2"/></g>`,
    kiln_crawler: `
      <path d="M3 136V13Q6 5 14 4H87L97 15V136Z" fill="none" stroke="#794333" stroke-width="7"/>
      <path d="M4 16 13 7h70l10 10M7 15v114M94 17v112" fill="none" stroke="#d69a6e" stroke-width="3"/>
      <path d="M2 22h9m-9 13h9m-9 13h9m-9 13h9m-9 13h9m-9 13h9m-9 13h9" stroke="#643b32" stroke-width="2"/>
      <path class="frame-kiln-mouth" d="M66 20V14Q68 2 80 2q13 0 15 14v5Z" fill="#9d5639" stroke="#613b32" stroke-width="1.5"/><path d="M71 17q0-11 9-11 10 0 10 11Z" fill="#452a2b" stroke="#e0a675"/>
      <path d="m75 4 2 4m8-5-2 5m9 3-4 2" stroke="#593b34"/>`,
    dusk_undertaker: `
      <path d="M3 137V22L21 4h58l18 20v112Z" fill="none" stroke="#4b4659" stroke-width="6"/><path d="M6 120V24L24 7h53l17 18v95" fill="none" stroke="#aaa0ab" stroke-width="2"/>
      <path d="M2 128q26-7 48 0t47-1v13H2Z" fill="#533b40" stroke="#7a6064"/><path d="M3 135q21-6 44-2t49 0" fill="none" stroke="#302830" stroke-width="2"/>
      <g class="frame-dusk-spade" transform="rotate(27 79 11)"><path d="M78 0v16" stroke="#c89e79" stroke-width="3"/><path d="M72 14h13l-1 7-6 6-5-7Z" fill="#96909b" stroke="#4b4659"/><path d="m77 16 1 8" stroke="#d2c4bd"/></g>`,
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
    const frame = id ? ' data-familiar-frame="' + id + '"' : '';
    return frame + (item?.kind === 'familiar' && item.edition === 'negative' ? ' data-familiar-edition="negative"' : '');
  }
  function inkGauge(item) {
    const filled = Math.min(12, Math.max(0, (Number(item.stackAmount) || 4) - 4));
    return Array.from({length:12}, (_, i) =>
      '<rect class="frame-ink-mark' + (i < filled ? ' charged' : '') + '" x="2.3" y="' + (89 - i * 4) + '" width="5.4" height="2.6" rx=".6"/>'
    ).join('');
  }
  function chargeMarks(id, item) {
    if (id === 'fox_in_ink') return inkGauge(item);
    if (id === 'kettle_hag') return item.charge?.value === 1 ? '<path d="M63 30h26l-2 8q-4 4-10 4t-11-4Z" fill="#8de5c1" stroke="#dffff1" stroke-width="1.1"/><path class="frame-steam" d="M65 24q-5-4-1-8t-1-8m6 12q-3-3 0-6" fill="none" stroke="#d7f5cd" stroke-width="2"/><circle cx="83" cy="35" r="2.3" fill="#effff1"/>' : '';
    if (id === 'dusk_undertaker') {
      const charge = Math.round(((item.charge?.value ?? 1) - 1) / .15);
      // The lower edge sits behind card names in the table row. Set the niches into both side rails.
      return Array.from({length:10}, (_, i) =>
        '<ellipse cx="' + (i < 5 ? 4.6 : 95.4) + '" cy="' + (93 - (i % 5)*9) + '" rx="3.3" ry="3" fill="' + (i < charge ? '#ffb66c' : '#30282c') + '" stroke="' + (i < charge ? '#ffdaa0' : '#847079') + '" stroke-width="1"/>'
      ).join('');
    }
    if (id === 'kiln_crawler') {
      const fuel = Math.max(0, Math.round(((item.charge?.value ?? 20) - 20) / 10));
      const pellets = Array.from({length:Math.min(6, fuel)}, (_, i) =>
        '<circle cx="' + (75 + 4*(i%3)) + '" cy="' + (15 - 3.7*Math.floor(i/3)) + '" r="2.2" fill="#ff9b55"/>').join('');
      return fuel > 6 ? pellets + '<text x="80" y="30" text-anchor="middle" fill="#ffe29f" stroke="#673b30" stroke-width="1" paint-order="stroke" font-size="10" font-weight="bold">' + fuel + '</text>' : pellets;
    }
    return '';
  }
  function ornament(item) {
    const id = baseId(item);
    const trim = id ? '<svg class="cw-familiar-trim" aria-hidden="true" focusable="false" viewBox="0 0 100 140" preserveAspectRatio="none">' + frames[id] + chargeMarks(id, item) + '</svg>' : '';
    if (item?.kind !== 'familiar' || item.edition !== 'negative') return trim;
    return trim + '<svg class="familiar-eclipse-seal" viewBox="0 0 40 20" aria-hidden="true" focusable="false">' +
      '<path d="M1 5 5 1h30l4 4v10l-4 4H5l-4-4Z" fill="#17182e" stroke="#c4f8fb" stroke-width="1.5"/>' +
      '<path d="M12.8 3.9a6.1 6.1 0 1 0 3.1 9.6 5.2 5.2 0 0 1-3.1-9.6Z" fill="#b3f9ff"/><path d="m15 4 .8 1.8 1.9.7-1.9.7L15 9l-.7-1.8-1.8-.7 1.8-.7Z" fill="#e8ccff"/>' +
      '<path d="M20 10h7m-3.5-3.5v7m5-5.5 3.5-2v9m-3 0h6" fill="none" stroke="#fff0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  window.CWFamiliarFrames = {attribute, ornament};
})();
