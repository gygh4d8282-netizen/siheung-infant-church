export function GardenArt() {
  return (
    <svg
      className="garden-art"
      viewBox="0 0 620 460"
      role="img"
      aria-label="햇살 아래 나란히 자라는 새싹과 작은 교회 삽화"
    >
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#bddde7" />
        </pattern>
      </defs>
      <rect width="620" height="460" rx="60" fill="#ddf2ff" />
      <rect width="620" height="460" rx="60" fill="url(#dots)" />
      <circle cx="478" cy="104" r="45" fill="#ffda6f" />
      <g stroke="#ffda6f" strokeWidth="5" strokeLinecap="round">
        <path d="M478 40v-12m0 152v-12m64-64h12m-152 0h12m109-45 9-9m-109 109 9-9m91 0 9 9m-109-109 9 9" />
      </g>
      <path
        d="M60 155c-5-22 20-36 37-24 6-34 57-36 66 0 27-8 44 9 38 25z"
        fill="#fffdf6"
      />
      <path
        d="M332 76c0-17 19-26 32-16 8-25 45-23 49 2 21-4 31 7 27 20H332z"
        fill="#fffdf6"
      />
      <path d="M0 363Q150 295 300 362T620 340V460H0z" fill="#bfdaa5" />
      <path d="M0 414q152-65 308-19t312-17v82H0z" fill="#d8e6b7" />
      <path d="M162 219h199v153H162z" fill="#fffdf5" />
      <path
        d="M139 229 262 127 385 229"
        fill="#efaa83"
        stroke="#e99570"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M255 140v-43m-16 16h32"
        stroke="#74684b"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M239 372v-61a25 25 0 0 1 50 0v61" fill="#9fc7d2" />
      <rect x="185" y="259" width="28" height="39" rx="14" fill="#ffda6f" />
      <rect x="311" y="259" width="28" height="39" rx="14" fill="#ffda6f" />
      <path d="M270 372q-11 51 84 88h-95q-35-51-6-88" fill="#f7e9c5" />
      <g stroke="#5a7b56" strokeWidth="7" strokeLinecap="round">
        <path d="M107 385v-62m360 62v-94m64 101v-40" />
      </g>
      <g fill="#77a66d">
        <ellipse
          cx="90"
          cy="336"
          rx="23"
          ry="12"
          transform="rotate(35 90 336)"
        />
        <ellipse
          cx="125"
          cy="320"
          rx="23"
          ry="12"
          transform="rotate(-35 125 320)"
        />
        <ellipse
          cx="442"
          cy="326"
          rx="29"
          ry="15"
          transform="rotate(35 442 326)"
        />
        <ellipse
          cx="490"
          cy="306"
          rx="29"
          ry="15"
          transform="rotate(-35 490 306)"
        />
        <ellipse
          cx="514"
          cy="359"
          rx="19"
          ry="10"
          transform="rotate(35 514 359)"
        />
        <ellipse
          cx="548"
          cy="347"
          rx="19"
          ry="10"
          transform="rotate(-35 548 347)"
        />
      </g>
      <g fill="#fff6d5">
        <circle cx="65" cy="417" r="5" />
        <circle cx="163" cy="401" r="5" />
        <circle cx="405" cy="422" r="5" />
        <circle cx="570" cy="418" r="5" />
      </g>
    </svg>
  );
}
