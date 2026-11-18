/* Frame ornaments use a 100 x 140 die. Open centers keep the portrait and its edition visible. */
(() => {
  'use strict';
  const frames = {
    brass_lantern: `
      <path d="M4 135V19L16 5h66l14 14v116Z" fill="none" stroke="#61422c" stroke-width="6"/><path d="M6 128V20L17 8h64l12 13v103" fill="none" stroke="#caa65f" stroke-width="2"/>
      <path d="M3 34h8v13H3zm0 48h8v13H3" fill="#c7a260" stroke="#594733"/><path d="M4 36h5m-5 49h5" stroke="#fae4a1"/>
      <g class="frame-lantern-door"><path d="m74 8 14-4 9 10-1 28-19-7Z" fill="#785336" stroke="#e2be78" stroke-width="1.5"/><path d="m78 12 8-3 7 6-1 19-11-3Z" fill="#342c30" stroke="#a17d4d"/>
      <path class="frame-lantern-wick" d="M81 27q3-3 1-10l4 2 2-4q3 6 1 13Z" fill="#ffe19b" stroke="#c8894c"/><path d="m82 30 9 2-2 3-9-3Z" fill="#e3b771"/></g>
      <path d="M93 69h5v12h-5l-4-5Z" fill="#cca66e" stroke="#705035"/>`,
    mire_printer: `
      <path d="M5 135V8L96 5v131Z" fill="none" stroke="#494539" stroke-width="6"/>
      <path d="M6 20q3 14 0 22t1 21m84 35q3 13 0 22" fill="none" stroke="#89836a" stroke-width="2"/>
      <g class="frame-print-roller"><path d="M14 4h58l3 3-3 5H14l-3-4Z" fill="#8c7153" stroke="#493e32"/><ellipse cx="14" cy="8" rx="4" ry="5" fill="#c09a73"/>
      <path d="m22 5-3 6m16-6-3 6m16-6-3 6m16-6-3 6" stroke="#544637" stroke-width="2"/></g>
      <g class="frame-print-stamp"><path d="m78 5 7-3 7 4-1 7-4 2 1 5-10 2-1-6-4-3Z" fill="#78573d" stroke="#514131"/><path d="m73 21 20-4 2 7-20 4Z" fill="#383c39" stroke="#b1a187"/><path d="m76 27 16-3" stroke="#67a1a7" stroke-width="2"/></g>
      <path d="M4 39h8v68H3Z" fill="#303c38" stroke="#746b50"/>`,
    silken_broker: `
      <rect x="4" y="4" width="92" height="132" rx="12" fill="none" stroke="#775465" stroke-width="6"/>
      <rect x="6" y="6" width="88" height="128" rx="9" fill="none" stroke="#d5a989" stroke-width="1.6"/>
      <path class="frame-broker-ribbon" d="M1 23Q14 8 32 8L47 4H20Q7 4 1 14Zm2 4q15-14 24-14l-5 5-6 1 1 5-7 7 1-8Z" fill="#dd92a1" stroke="#854f68" stroke-width="1.3"/>
      <g class="frame-broker-clasp"><path d="m85 53 9-5 5 5v16l-5 4-9-6Z" fill="#a77450" stroke="#6f4a44"/><ellipse cx="92" cy="60" rx="5.9" ry="7.2" fill="#e4bc78" stroke="#ffe2a0"/>
      <path d="m92 55 3 5-3 5-3-5Z" fill="#a06670"/></g>
      <path d="M3 106 12 121l-7 9m78 1 10-11" fill="none" stroke="#b17c88" stroke-width="2.6"/>`,
    granite_tinker: `
      <path d="M4 136V18L18 4h64l14 14v118Z" fill="none" stroke="#686e6d" stroke-width="6"/>
      <path d="M8 14 19 7H80l12 11m0 13v89" fill="none" stroke="#aeb7a9" stroke-width="2.2"/>
      <path d="M3 25h9v84h-9Z" fill="#455059" stroke="#989491"/><path d="M2 111h17l-5 6H2" fill="#b6ab91" stroke="#6c6865"/>
      <g class="frame-mason-gear"><path d="m78 5 2-4 4 1 1 4 4-1 3 3-2 4 3 2-1 4-4 1 1 4-4 2-3-3-3 2-3-3 1-3-4-1-1-4 4-2-2-4 3-3Z" fill="#bab9ab" stroke="#545e61"/><circle cx="81" cy="13" r="5" fill="#697575" stroke="#e3d6ba"/></g>
      <path class="frame-keystone" d="M43 2h16l-4 13H47Z" fill="#9a9d9e" stroke="#54545d" stroke-width="1.5"/><path d="m47 5 3 2-1 3" fill="none" stroke="#d5c6b7"/>`,
    shopbell_sprite: `
      <path d="M4 136V15l9-10h73l10 12v118Z" fill="none" stroke="#725135" stroke-width="6"/>
      <path d="M5 126V16l9-8h67l12 10v87" fill="none" stroke="#c69b68" stroke-width="2"/>
      <path d="M52 4h40l3 6-7 2-4-3H52Z" fill="#9b6944" stroke="#63412d"/><circle cx="56" cy="7" r="2" fill="#edcc86"/>
      <g class="frame-doorbell"><path d="m80 8 6 2-9 3 9 2-8 3 6 1" fill="none" stroke="#d9d5b5" stroke-width="1.7"/>
      <path d="M72 33q5-3 4-9-1-6 6-7 7 0 7 6t6 9l-1 3-21 2Z" fill="#d9ae62" stroke="#775035" stroke-width="1.6"/>
      <path d="m76 32 14-2m-13-3q2-1 1-5" stroke="#ffe6a1" fill="none" stroke-width="2"/><circle cx="84" cy="36" r="2.5" fill="#edcb86" stroke="#906444"/></g>`,
    vault_maggot: `
      <path d="M3 135V14L13 4h72l12 12v119Z" fill="none" stroke="#605847" stroke-width="6"/><path d="M5 126V17L14 7h70l10 12v104" fill="none" stroke="#c3ab7a" stroke-width="1.6"/>
      <path d="M1 30q15 11 15 39t-15 42Z" fill="#716c5d" stroke="#c7b383" stroke-width="1.7"/>
      <path d="M1 43q10 9 10 26t-10 29Z" fill="#423e3e" stroke="#b6a581"/>
      <g class="frame-vault-latch"><circle cx="3" cy="69" r="5" fill="#cbb67f" stroke="#5c4d3e"/><path d="m3 67 6-4-4 7Z" fill="#fff0b4"/></g>
      <path d="M90 13h6v15h-6Zm1 89h5v12h-5Z" fill="#a9936e" stroke="#695e4b"/>`,
    alabaster_finch: `
      <path d="M3 135V18L14 4h72l11 14v118Z" fill="none" stroke="#706976" stroke-width="6"/>
      <path d="M5 126V20l10-13h67l12 12v103" fill="none" stroke="#deded3" stroke-width="2.6"/>
      <path d="m4 25 6 3-5 4m87 57-3 5 5 5" fill="none" stroke="#9a919a" stroke-width="1.6"/>
      <g transform="translate(-24 -1)"><g class="frame-marble-perch"><path d="M63 23q5 0 7-4l20-1 6 6-4 3-4-2-5 3-5-2-5 2-4-3-6 1Z" fill="#d6d2c9" stroke="#716d7d" stroke-width="1.2"/>
      <path d="M66 20q6-3 10-10 4-8 10-7 4 1 5 5l5 3-6 2q-2 6-8 8l-5-1-4 3Z" fill="#faf1d9" stroke="#807880" stroke-width="1.5"/><path d="M71 19q8-2 13-10-2 9-8 11Z" fill="#bab7b5"/>
      <path class="frame-finch-eye" d="M81 10q3-5 7-1-2 5-7 1Z" fill="#ef4876" stroke="#82334c"/><path d="m81 10 6-1" stroke="#665465" stroke-width="1.2"/></g></g>`,
    dustfin: `
      <path d="M4 135V24Q5 6 17 5h64q15 1 15 19v110Z" fill="none" stroke="#40666d" stroke-width="6"/>
      <path d="M4 120q-4-27 2-51m88 13q5 27-1 41" fill="none" stroke="#a4d3cf" stroke-width="2"/>
      <g class="frame-shell-scoop"><path d="M72 8Q45 5 36 16q8-1 9-1l-3 5q11-3 15-9l15 2Z" fill="#63aaa9" stroke="#305e71" stroke-width="1.4"/>
      <path d="M71 5q12 0 21 7l-2 12q-10-5-24-5Z" fill="#beded8" stroke="#3b7484" stroke-width="1.8"/><path d="M71 16q8-3 17 4l1-7q-6-4-15-5Z" fill="#709ebb"/><path d="m74 10 1 6m4-5 1 6m4-5 1 6" stroke="#daeae1" stroke-width="1.3"/></g>
      <g class="frame-dust-grains" fill="#a6dcf6"><circle cx="88" cy="30" r="1.7"/><circle cx="93" cy="34" r="1.4"/><circle cx="90" cy="38" r="1.8"/></g>`,
    glimmer_orca: `
      <path d="M4 135V24Q6 3 32 4h44q18 0 20 19v111Z" fill="none" stroke="#1f3c57" stroke-width="6"/>
      <path d="M4 119q7-11 4-20-4-9-2-16-7 6-6 16m94-72q-14-5-20-14 6 2 10 1-9-6-10-12 16 4 22 12" fill="#e5ece9" stroke="#364957" stroke-width="1.5"/>
      <path class="frame-orca-crest" d="M3 74Q1 50 5 31 10 5 36 4q13 0 13 9-3-4-8-3-6 3-9 10 0-6 3-9Q13 15 12 35q-6 15-9 39Z" fill="#131f33" stroke="#99d3da" stroke-width="1.7"/><path d="M10 27Q14 13 29 9q-8 3-12 11Z" fill="#eef1db"/>
      <path d="M4 127q14-6 20-1t14 3m43-27q12-7 12-19" fill="none" stroke="#74a4b5" stroke-width="2"/>`,
    moss_badger: `
      <path d="M4 136V25L12 8l20-3 49-1 13 16 3 113Z" fill="none" stroke="#55594b" stroke-width="6"/>
      <path d="M4 103q-5-16 0-20-2-6 3-11 0 10 5 13l-4 12m84-55q-5-7-2-12-3-6 2-10l5 13" fill="#65804c" stroke="#42543b" stroke-width="1.2"/>
      <path class="frame-moss-stone" d="m60 5 8-4 15 3 5 7-9 7-14-1-7-5Z" fill="#929483" stroke="#515451" stroke-width="1.8"/><path d="m58 7 9-6 7 1 6-1 7 5-4 3-5-1-4 3-7-2-4 2Z" fill="#829659" stroke="#495e3f"/>
      <path class="frame-badger-claws" d="m54 10 12 10-4-9m26-4-7 12 9-7" fill="#e6dabb" stroke="#585952"/><path d="m71 10 5 3 4-4" fill="none" stroke="#c2c2a6"/>`,
    lattice_toad: `
      <path d="M4 134 5 6l90-1 1 130ZM10 8l81 1M9 16 9 125m82-111v111" fill="none" stroke="#887c4a" stroke-width="3"/>
      <path d="M3 15 12 8m-9 13 10-8m76-1 8 6m-8 1 8 6" stroke="#ad604f" stroke-width="2.5"/>
      <path d="M39 7q14-12 28 0-8 8-23 6l9-6-14 3Z" fill="#719663" stroke="#485a42"/>
      <g fill="#384e42" stroke="#c7b17b" stroke-width="1.6">
        <path class="frame-rank-1" d="m7 41 6 8-6 8-6-8Z"/><path class="frame-rank-2" d="m93 41 6 8-6 8-6-8Z"/>
        <path class="frame-rank-3" d="m7 76 6 8-6 8-6-8Z"/><path class="frame-rank-4" d="m93 76 6 8-6 8-6-8Z"/>
      </g><path d="m3 56 7 2m80 1 7-2M3 92l7 2m80 0 7-2" stroke="#d57c67" stroke-width="2.5"/>`,
    veil_firefly: `
      <path d="M4 136V17L14 4h73l9 14v117Z" fill="none" stroke="#534a70" stroke-width="5"/>
      <path d="M3 35q6-20 18-27m-16 5q10 2 18-5m57-2q12 9 16 25m-17-23q9 7 14 5m-90 90q4 11 12 16m70-1 11-16" fill="none" stroke="#aaa0b6" stroke-width="1.5"/>
      <path class="frame-firefly-lamp" d="M46 2h8v3l3 5-3 5h-8l-3-5 3-5Z" fill="#adab76" stroke="#595368" stroke-width="1.5"/>
      <g fill="#534861" stroke="#d2c3ad" stroke-width="1.3">
        <path class="frame-suit-S" d="M8 36q-9 8-6 11 3 3 6-1l-2 5h5l-2-5q3 4 6 1 3-3-7-11Z"/>
        <path class="frame-suit-H" d="M92 51q-13-11-6-14 4-2 6 2 2-4 6-2 6 3-6 14Z"/>
        <path class="frame-suit-C" d="M7 76q-4-4-1-7 3-3 6 0 2 3-1 7 5-4 6 1 1 6-7 3l2 6H6l2-6q-6 3-7-1 0-5 6-3Z"/>
        <path class="frame-suit-D" d="m92 68 7 9-7 9-7-9Z"/>
      </g>`,
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
  const progressScales = {
    mire_printer: {base:28, step:15, marks:6},
    granite_tinker: {base:35, step:12, marks:8},
    vault_maggot: {base:1.3, step:.15, marks:10}
  };
  function progressMarks(id, item) {
    const {base, step, marks} = progressScales[id];
    const amount = Number(String(item.stackAmount ?? base).replace(/^[+x×]/i, ''));
    const filled = Number.isFinite(amount) ? Math.max(0, Math.min(marks, Math.round((amount-base)/step))) : 0;
    return Array.from({length:marks}, (_,i) => {
      const lit = i < filled;
      const css = 'class="frame-progress-mark' + (lit ? ' lit' : '') + '"';
      if (id === 'vault_maggot') {
        const angle = -1.38 + i * 2.76 / (marks-1);
        const x = 2 + 12*Math.cos(angle), y = 69 + 35*Math.sin(angle);
        return '<ellipse ' + css + ' cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" rx="2.7" ry="2.9" fill="' + (lit ? '#fce294' : '#45403b') + '" stroke="' + (lit ? '#fff3bc' : '#a19376') + '"/>';
      }
      if (id === 'granite_tinker') {
        return '<path ' + css + ' d="M3 ' + (101-9*i) + 'h7l-2 4H3Z" fill="' + (lit ? '#ffcd77' : '#8a9390') + '" stroke="' + (lit ? '#ffe4a0' : '#4a5359') + '"/>';
      }
      return '<rect ' + css + ' x="4" y="' + (98-10*i) + '" width="7" height="6" rx="1" fill="' + (lit ? '#9ce1d2' : '#485b54') + '" stroke="' + (lit ? '#d7f8dd' : '#73786a') + '"/>';
    }).join('');
  }
  function chargeMarks(id, item) {
    if (Object.hasOwn(progressScales, id)) return progressMarks(id, item);
    if (id === 'fox_in_ink' && item.inkReady !== false) return '<path d="M81 43q5 3 12 0l-2 6-10-1z" fill="#ec9cdb"/>';
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
