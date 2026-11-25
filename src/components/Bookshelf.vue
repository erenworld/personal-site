<script lang="ts" setup>
// Layout and shelf drawing adapted from https://kenneth.io/reading
import { computed, onMounted, ref } from 'vue'
import reading from '../data/reading.json'

type Entry = {
  id: string; title: string; author: string; type: string; category: string; url: string;
  description: string; color: string; ink: string; publishedYear?: number; cover?: string; coverRatio?: number; suggested?: boolean;
}
type Part = { t?: string; parts?: string[][]; fs?: number; weight?: number; track?: string; color?: string; font?: string }
type Spine = {
  h: number; w: number; bind?: string; font?: string; flip?: boolean; creased?: boolean;
  lines: Part[]; author?: Part; bands?: { at: string; size: number; color: string }[];
}

const books = reading as Entry[]
const px = (n: number) => `${n}px`
const metadata = (entry: Entry) => entry.publishedYear ? `Published ${entry.publishedYear}` : ''

const SERIF = "'Newsreader', 'Iowan Old Style', Palatino, Georgia, serif";

// Hand-set spines. Everything else is typeset from the title by autoSpine.
const SPINES: Record<string, Spine> = {
  'zero-to-one': {
    h: 152, w: 17, bind: 'hard', font: SERIF,
    lines: [{ parts: [['ZERO TO ', '#15171a'], ['ONE', '#eef2f6']], fs: 10, track: '0.08em' }],
    author: { t: 'Peter Thiel', fs: 8, color: '#15171a' },
  },
  'high-output-management': {
    h: 160, w: 19, bind: 'paper', creased: true,
    lines: [{ t: 'High Output Management', fs: 7, weight: 600, color: '#f59a45' }],
    author: { t: 'GROVE', fs: 7.5, track: '0.1em', color: '#ffffff' },
    bands: [{ at: 'bottom', size: 9, color: '#ee8f34' }],
  },
  'le-pouvoir-des-habitudes': {
    h: 160, w: 26, bind: 'paper',
    lines: [
      { t: 'THE POWER OF', fs: 7, weight: 700, track: '0.08em' },
      { t: 'HABIT', fs: 13, weight: 800, track: '0.06em', color: '#e3262e' },
    ],
    author: { t: 'Duhigg', fs: 8, weight: 700 },
    bands: [{ at: 'top', size: 12, color: '#e3262e' }],
  },
};

const hash = (text: string) => [...text].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 7);
const autoSpine = (entry: Entry): Spine => {
  const n = hash(entry.id);
  // Subtitles stay off the spine
  // and curly apostrophes would stand upright in vertical text
  const name = entry.title.split(': ')[0].replace(/’/g, "'");
  const upper = (n >>> 8) % 3 !== 0;
  const h = 150 + (n % 9) * 5;
  let w = 17 + ((n >>> 4) % 6) * 2;
  const text = upper ? name.toUpperCase() : name;
  const surname = (entry.author.split(/,| and /)[0] || '').trim().split(' ').slice(-1)[0];
  const author = upper ? surname.toUpperCase() : surname;
  const serif = (n >>> 10) % 4 === 0;
  const glyph = (upper ? 0.72 : 0.58) + (serif ? 0.08 : 0);
  const room = h - 18 - 12 - author.length * 6 * glyph;
  let lines = [text];
  let fs = room / (text.length * glyph);
  if (fs < 5.6) {
    // Long titles run over two lines, split at the word nearest the middle
    const words = text.split(' ');
    let best = 1;
    for (let i = 1; i < words.length; i += 1) {
      const at = words.slice(0, i).join(' ').length;
      if (Math.abs(at - text.length / 2) < Math.abs(words.slice(0, best).join(' ').length - text.length / 2)) best = i;
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    w = Math.max(w, 23);
    fs = Math.min(room / (Math.max(...lines.map((line) => line.length)) * glyph), (w - 7) / 2.3);
  }
  fs = Math.round(Math.max(4.4, Math.min(8.5, w * 0.42, fs)) * 10) / 10;
  return {
    h, w,
    bind: (n >>> 12) % 4 === 0 ? 'hard' : 'paper',
    creased: (n >>> 14) % 3 === 0,
    flip: (n >>> 16) % 5 === 0,
    font: serif ? SERIF : undefined,
    lines: lines.map((t) => ({ t, fs, weight: 600, track: upper ? '0.03em' : undefined })),
    author: { t: author, fs: 6, weight: 500, track: upper ? '0.03em' : undefined },
  };
};
const spineFor = (entry: Entry) => SPINES[entry.id] || autoSpine(entry);

// One category per shelf, in wide + narrow pairs from the top.
const SHELVES = [
  'Biographies', 'Fiction',
  'Databases & code', 'Philosophy',
  'Business & startups', 'Money',
  'Mind & habits', 'Sales & people',
];
const bays = SHELVES.map((category, index) =>
  // A book with no category, or one not listed above, still gets a place on the last shelf.
  books
    .filter(entry => SHELVES.includes(entry.category) ? entry.category === category : index === SHELVES.length - 1)
    .map(entry => {
      const spine = spineFor(entry)
      const band = (at: string) => spine.bands?.find(b => b.at === at)?.size || 0
      return {
        entry,
        spine,
        style: {
          '--bg': entry.color,
          '--ink': entry.ink,
          '--h': px(spine.h),
          '--w': px(spine.w),
          '--pt': px(9 + band('top')),
          '--pb': px(9 + band('bottom')),
          fontFamily: spine.font,
        },
      }
    }),
);
const shelfOrder = bays.flat().map(book => book.entry);

const textStyle = (part: Part) => ({
  '--fs': px(part.fs || 9),
  color: part.color,
  fontWeight: part.weight,
  letterSpacing: part.track,
});

// Nothing is selected to begin with; pressing a book opens its details, pressing it again closes them.
const selectedId = ref<string | null>(null)
const selected = computed(() => shelfOrder.find(entry => entry.id === selectedId.value))
const bookNodes: Record<string, HTMLElement> = {}

// Fetch and decode every cover ahead of the first click, so details open with no visible
// loading. Kept referenced so the browser doesn't drop the decoded images.
const preloaded: HTMLImageElement[] = []
onMounted(() => {
  for (const { cover } of shelfOrder) {
    if (!cover)
      continue
    const image = new Image()
    image.fetchPriority = 'low'
    image.src = cover
    image.decode().catch(() => {})
    preloaded.push(image)
  }
})

function toggle(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function onBookKeydown(event: KeyboardEvent, id: string) {
  if (event.key === 'Escape' && selectedId.value) {
    event.preventDefault()
    selectedId.value = null
    return
  }
  const index = shelfOrder.findIndex(entry => entry.id === id)
  const next = {
    ArrowRight: shelfOrder[index + 1],
    ArrowLeft: shelfOrder[index - 1],
    Home: shelfOrder[0],
    End: shelfOrder[shelfOrder.length - 1],
  }[event.key]
  if (!next)
    return
  event.preventDefault()
  // Arrow keys move along the shelf; the details follow only while they are open
  if (selectedId.value)
    selectedId.value = next.id
  bookNodes[next.id]?.focus()
}
</script>

<template>
  <div class="reading">
    <header>
      <h1 class="text-title mb-2">Reading</h1>
      <p class="intro">The books on my shelf, the ones I’ve read and the ones I’m getting to.</p>
    </header>

    <section aria-label="Books bookshelf">
      <div class="wall">
        <div class="system">
          <div
            v-for="(bay, bayIndex) in bays" :key="bayIndex" role="group" :aria-label="SHELVES[bayIndex]"
            class="bay" :class="[bayIndex % 2 ? 'bay-b' : 'bay-a', {
              'm-first': bayIndex === 0,
              'm-last': bayIndex === bays.length - 1,
              'd-first': bayIndex < 2,
              'd-last': bayIndex >= bays.length - 2,
            }]"
          >
            <span v-for="side in ['l', 'r']" :key="side" class="upright" :class="`upright-${side}`" aria-hidden="true">
      <svg aria-hidden="true" focusable="false" class="rail">
        <defs>
          <linearGradient :id="`rail-${bayIndex}-${side}-channel`" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="5.5" y2="0">
            <stop offset="0" stop-color="#2f3335" />
            <stop offset="0.35" stop-color="#4d5254" />
            <stop offset="1" stop-color="#6e7375" />
          </linearGradient>
          <linearGradient :id="`rail-${bayIndex}-${side}-channel1`" gradientUnits="userSpaceOnUse" x1="7.5" y1="0" x2="11" y2="0">
            <stop offset="0" stop-color="#2f3335" />
            <stop offset="0.35" stop-color="#4d5254" />
            <stop offset="1" stop-color="#6e7375" />
          </linearGradient>
          <linearGradient :id="`rail-${bayIndex}-${side}-leg`" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2" y2="0" spreadMethod="repeat">
            <stop offset="0" stop-color="#f4f5f5" />
            <stop offset="0.3" stop-color="#d7d9da" />
            <stop offset="1" stop-color="#b3b7b8" />
          </linearGradient>
          <pattern :id="`rail-${bayIndex}-${side}-screws`" patternUnits="userSpaceOnUse" x="0" y="34" width="13" height="70">
            <circle cx="6.5" cy="3" r="2.3" fill="#3a3e40" />
            <circle cx="6.5" cy="3" r="1.8" fill="#c4c7c9" stroke="#8a8f91" stroke-width="0.3" />
            <circle cx="6.1" cy="2.6" r="0.8" fill="#eceeee" opacity="0.8" />
            <path d="M6.5 1.7 L6.5 4.3" stroke="#4c5052" stroke-width="0.5" stroke-linecap="round" />
          </pattern>
        </defs>
        <rect x="2" y="0" width="3.5" height="100%" :fill="`url(#rail-${bayIndex}-${side}-channel)`" />
        <rect x="7.5" y="0" width="3.5" height="100%" :fill="`url(#rail-${bayIndex}-${side}-channel1)`" />
        <svg x="0" y="0" width="2" height="100%" overflow="visible">
          <rect x="0" y="0" width="2" height="100%" :fill="`url(#rail-${bayIndex}-${side}-leg)`" />
        </svg>
        <svg x="5.5" y="0" width="2" height="100%" overflow="visible">
          <rect x="0" y="0" width="2" height="100%" :fill="`url(#rail-${bayIndex}-${side}-leg)`" />
        </svg>
        <svg x="11" y="0" width="2" height="100%" overflow="visible">
          <rect x="0" y="0" width="2" height="100%" :fill="`url(#rail-${bayIndex}-${side}-leg)`" />
        </svg>
        <rect x="0" y="0" width="13" height="100%" :fill="`url(#rail-${bayIndex}-${side}-screws)`" />
        <g class="rail-cap">
          <rect x="0" y="0" width="2" height="0.8" fill="#ffffff" />
          <rect x="5.5" y="0" width="2.0" height="0.8" fill="#ffffff" />
          <rect x="11" y="0" width="2" height="0.8" fill="#ffffff" />
          <rect x="2" y="0" width="3.5" height="1.2" fill="#1d2022" />
          <rect x="7.5" y="0" width="3.5" height="1.2" fill="#1d2022" />
        </g>
      </svg>
            </span>
            <div class="tray">
              <div class="row">
                <button
                  v-for="({ entry, spine, style }, bookIndex) in bay" :key="entry.id"
                  :ref="(node) => { if (node) bookNodes[entry.id] = node as HTMLElement }" type="button"
                  class="book" :class="[`book-${spine.bind || 'paper'}`, { 'book-lean': bayIndex === 0 && bookIndex === 0 }]"
                  :style="style" :aria-label="`${entry.title} by ${entry.author}`" :aria-pressed="entry.id === selectedId"
                  @click="toggle(entry.id)" @keydown="onBookKeydown($event, entry.id)"
                >
                  <span class="spine" :class="{ 'spine-creased': spine.creased }" aria-hidden="true">
                    <span
                      v-for="band in spine.bands" :key="band.at" class="band" :class="`band-${band.at}`"
                      :style="{ '--band': px(band.size), background: band.color }"
                    />
                    <span class="spine-text" :class="{ 'spine-flip': spine.flip }">
                      <span class="spine-title">
                        <span v-for="(line, i) in spine.lines" :key="i" class="line" :style="textStyle(line)">
                          <template v-if="line.parts"><span v-for="[text, color] in line.parts" :key="text" :style="{ color }">{{ text }}</span></template>
                          <template v-else>{{ line.t }}</template>
                        </span>
                      </span>
                      <span v-if="spine.author?.t" class="spine-author line" :style="textStyle(spine.author)">{{ spine.author.t }}</span>
                    </span>
                    <span class="spine-light" />
                  </span>
                </button>
                <span v-if="bayIndex % 2" class="bookend" aria-hidden="true" />
              </div>
              <span class="shelf-label" aria-hidden="true">{{ SHELVES[bayIndex] }}</span>
              <div class="shelf" aria-hidden="true">
                <span class="shelf-shadow" />
      <svg aria-hidden="true" focusable="false" width="100%" height="10" class="shelf-svg">
        <defs>
          <linearGradient :id="`shelf-${bayIndex}-lip`" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="8">
            <stop offset="0" stop-color="#ffffff" />
            <stop offset="0.3" stop-color="#f5f4ee" />
            <stop offset="0.75" stop-color="#e6e5dc" />
            <stop offset="0.9" stop-color="#cfcec3" />
            <stop offset="1" stop-color="#aeada2" />
          </linearGradient>
          <linearGradient :id="`shelf-${bayIndex}-deck`" gradientUnits="userSpaceOnUse" x1="0" y1="-4" x2="0" y2="0">
            <stop offset="0" stop-color="#dddcd1" />
            <stop offset="1" stop-color="#ebeae1" />
          </linearGradient>
          <linearGradient :id="`shelf-${bayIndex}-edge`" gradientUnits="userSpaceOnUse" x1="0" y1="-68" x2="0" y2="5">
            <stop offset="0" stop-color="#f7f6f0" />
            <stop offset="1" stop-color="#e3e2d8" />
          </linearGradient>
          <linearGradient :id="`shelf-${bayIndex}-pin`" gradientUnits="userSpaceOnUse" x1="0" y1="-58.9" x2="0" y2="-57.1">
            <stop offset="0" stop-color="#f2f3f3" />
            <stop offset="0.45" stop-color="#c2c5c7" />
            <stop offset="1" stop-color="#7f8486" />
          </linearGradient>
        </defs>
        <rect x="0" y="-4" width="100%" height="4.5" :fill="`url(#shelf-${bayIndex}-deck)`" />
        <rect x="0" y="-4.4" width="100%" height="0.8" fill="#cfcec2" />
        <rect x="-7.5" y="-58.9" width="3.5" height="1.8" :fill="`url(#shelf-${bayIndex}-pin)`" />
        <rect x="-13" y="-58.9" width="3.5" height="1.8" :fill="`url(#shelf-${bayIndex}-pin)`" />
        <rect x="-6.4" y="-68" width="1.4" height="70" rx="0.7" :fill="`url(#shelf-${bayIndex}-edge)`" />
        <rect x="-6.4" y="-67" width="0.45" height="68" fill="#ffffff" opacity="0.85" />
        <rect x="-5.350" y="-67" width="0.35" height="68" fill="#c6c5b9" opacity="0.8" />
        <svg x="100%" overflow="visible" >
          <rect x="4" y="-58.9" width="3.5" height="1.8" :fill="`url(#shelf-${bayIndex}-pin)`" />
          <rect x="9.5" y="-58.9" width="3.5" height="1.8" :fill="`url(#shelf-${bayIndex}-pin)`" />
          <rect x="5.0" y="-68" width="1.4" height="70" rx="0.7" :fill="`url(#shelf-${bayIndex}-edge)`" />
          <rect x="5.0" y="-67" width="0.45" height="68" fill="#ffffff" opacity="0.85" />
          <rect x="6.05" y="-67" width="0.35" height="68" fill="#c6c5b9" opacity="0.8" />
          <path d="M6.4 0 H-0.5 V4.5 Q0 2 2.6 2 H5.6 Q6.4 2 6.4 1.2 Z" :fill="`url(#shelf-${bayIndex}-lip)`" />
          <path d="M5.6 2 H2.6 Q0 2 -0.3 4.2" fill="none" stroke="#b9b8ac" stroke-width="0.35" opacity="0.55" />
        </svg>
        <path d="M-6.4 0 H0.5 V4.5 Q0 2 -2.6 2 H-5.6 Q-6.4 2 -6.4 1.2 Z" :fill="`url(#shelf-${bayIndex}-lip)`" />
        <path d="M-5.6 2 H-2.6 Q0 2 0.3 4.2" fill="none" stroke="#b9b8ac" stroke-width="0.35" opacity="0.55" />
        <rect x="0" y="0" width="100%" height="8" rx="3" :fill="`url(#shelf-${bayIndex}-lip)`" />
        <rect x="0" y="0" width="100%" height="4" :fill="`url(#shelf-${bayIndex}-lip)`" />
        <rect x="-4.7" y="0" width="100%" height="0.6" fill="#ffffff" opacity="0.9" />
      </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selected" class="entry-details" aria-label="Selected book" aria-live="polite">
        <button type="button" class="close" aria-label="Close details" @click="selectedId = null">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </button>
        <span v-if="selected.cover" class="cover"><img :key="selected.id" :src="selected.cover" :style="{ aspectRatio: selected.coverRatio }" decoding="sync" :alt="`${selected.title} cover`"></span>
        <span v-else class="cover cover-blank" :style="{ background: selected.color, color: selected.ink }" aria-hidden="true">{{ selected.title }}</span>
        <div>
          <p class="eyebrow">{{ selected.author }}</p>
          <h3>{{ selected.title }}</h3>
          <p class="meta">{{ [selected.category, metadata(selected)].filter(Boolean).join(' · ') }}</p>
          <p class="description">{{ selected.description }}</p>
          <a class="more prose-link" :href="selected.url" target="_blank" rel="noopener noreferrer">View book ↗</a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.reading { font-size: 14px; line-height: 20px; }
.spine-flip { flex-direction: row-reverse; }
header { margin-bottom: 40px; }
.intro { color: #666; margin: 0; font-size: 16px; line-height: 1.6; }
section { margin-bottom: 48px; }
h3 { font-size: 18px; font-weight: 600; color: #000; margin: 0 0 6px; line-height: 1.4; letter-spacing: -0.01em; }
.eyebrow { font-size: 13px; color: #666; font-weight: 500; letter-spacing: 0.01em; margin: 0 0 4px; }
.meta { font-size: 13px; color: #666; margin: 0 0 10px; }
.description { font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
.more { font-size: 13px; }
.rail { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; display: block; }
.shelf-svg { display: block; overflow: visible; }
.cover-blank { display: flex; align-items: center; aspect-ratio: 2 / 3; padding: 6px; font-size: 10px; line-height: 1.25; font-weight: 600; overflow: hidden; }

a:focus-visible { outline: 2px solid #333; outline-offset: 4px; border-radius: 2px; }

/* ---------- Wall: a cropped view of a 606 run ---------- */
.wall {
  /* Phones: bays stack at one width, so each tray has to hold a wide bay's books */
  --s: 0.68;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  padding: 0 8px;
  background: linear-gradient(100deg, #f7f6f3 0%, #f3f2ee 55%, #eeede8 100%);
}
.system { display: flex; flex-direction: column; max-width: 300px; margin: 0 auto; }
.bay { position: relative; min-width: 0; padding-left: 15px; padding-right: 15px; }
.bay { padding-top: 12px; padding-bottom: 18px; }
.bay.m-first { padding-top: 34px; }
.bay.m-last { padding-bottom: 38px; }

/* Aluminium E-track, drawn as explicit SVG faces by Rail above, straight on: two 4px flanges
   either side of an open 5px channel, 13px in all. Each tray stops 2px short of the rail and
   its pins bridge that gap, so trays sit 17px apart across a shared rail.
   Stacked bays share continuous rails; side by side they share the middle one. */
.upright {
  position: absolute; top: 0; bottom: -1px; width: 13px;
  background:
    none;
    
    
  filter: drop-shadow(0 1px 1.5px rgba(40, 38, 30, 0.16));
}
.upright-l { left: 0; }
.upright-r { right: 0; }
/* Stacked: the rails run unbroken from the upper bay into the lower one */
.m-first .upright { top: 16px; }
.m-last .upright { bottom: 14px; }
.bay:not(.m-first) .upright .rail-cap { display: none; }

/* ---------- Shelf: thin folded tray, seen straight on ---------- */
.tray { position: relative; }
.row {
  position: relative; z-index: 2;
  display: flex; align-items: flex-end; gap: 1px;
  height: calc(204px * var(--s));
  /* Books sit right against the upturned shelf ends, which hang in the rail tracks */
  padding: 0; margin: 0 -4.6px;
}
.bay-a .row { justify-content: flex-end; }
.bay-b .row { justify-content: flex-start; }

.shelf { position: relative; z-index: 1; height: 10px; }
/* Category tag clipped to the front edge of the shelf, like a library shelf label */
.shelf-label {
  position: absolute; z-index: 3; left: 8px; bottom: -4px;
  padding: 0 5px; height: 12px;
  font-size: 7px; line-height: 12px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
  white-space: nowrap; color: #55534c;
  background: linear-gradient(#fdfcf9, #f1f0ea);
  border-radius: 1.5px;
  box-shadow: 0 0 0 0.5px rgba(40, 38, 30, 0.22), 0 1px 1.5px rgba(40, 38, 30, 0.22);
}
/* Soft shadow the shelf casts on the wall, straight down */
.shelf-shadow {
  position: absolute; left: -6px; right: -6px; top: 6px; height: 40px;
  filter: blur(2.5px);
  background: linear-gradient(rgba(64, 62, 55, 0.58), rgba(64, 62, 55, 0.36) 22%, rgba(64, 62, 55, 0.12) 60%, rgba(64, 62, 55, 0));
}


/* ---------- Books ---------- */
.book {
  appearance: none; -webkit-appearance: none;
  position: relative; flex: 0 0 auto;
  width: calc(var(--w) * var(--s));
  height: calc(var(--h) * var(--s));
  margin: 0; padding: 0; border: 0; background: none;
  font: inherit; color: var(--ink);
  cursor: pointer;
  border-radius: 1px;
  box-shadow: 5px 1px 7px rgba(30, 28, 20, 0.17);
  transition: translate 180ms ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none; -webkit-user-select: none;
}
/* Top of the page block, just visible from above */
.book::before {
  content: ''; position: absolute; left: 0; right: 0; bottom: calc(100% - 1px);
  height: calc(4px * var(--s));
  border-radius: 1px 1px 0 0;
  background: linear-gradient(90deg, var(--bg) 0 1px, #cbc5b6 1px 1.75px, #ebe6d9 1.75px calc(100% - 1.75px), #cbc5b6 calc(100% - 1.75px) calc(100% - 1px), var(--bg) calc(100% - 1px));
  filter: brightness(0.93);
}
.book-hard::before, .book-cloth::before {
  background: linear-gradient(90deg, var(--bg) 0 2px, #bdb7a8 2px 3px, #ebe6d9 3px calc(100% - 3px), #bdb7a8 calc(100% - 3px) calc(100% - 2px), var(--bg) calc(100% - 2px));
}
/* Contact shadow on the tray */
.book::after {
  content: ''; position: absolute; left: 0; right: 0; top: 100%; height: 2px;
  background: linear-gradient(rgba(30, 28, 20, 0.26), rgba(30, 28, 20, 0));
  pointer-events: none;
}
.book-lean { rotate: 5deg; transform-origin: 100% 100%; margin-right: calc(var(--h) * var(--s) * 0.087); }
.book-lean::after { display: none; }

.book:hover { translate: 0 -2px; }
.book[aria-pressed='true'] { translate: 0 -6px; }
.book[aria-pressed='true']::after, .book:hover::after { opacity: 0; }
.book:focus-visible { outline: 2px solid #333; outline-offset: 3px; z-index: 3; }

.spine {
  position: absolute; inset: 0; overflow: hidden; display: block;
  background-color: var(--bg);
  border-radius: 1px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), inset 0 -1px 0 rgba(0, 0, 0, 0.16);
}
.book-hard .spine, .book-cloth .spine { border-radius: 2.5px 2.5px 1px 1px / 2px 2px 1px 1px; }

/* Light from upper left: flat card for paperbacks, rounded back for hardcovers */
.spine-light {
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 16%, rgba(0, 0, 0, 0) 78%, rgba(0, 0, 0, 0.1)),
    linear-gradient(90deg, rgba(0, 0, 0, 0.16) 0, rgba(255, 255, 255, 0.12) 9%, rgba(255, 255, 255, 0) 38%, rgba(0, 0, 0, 0.03) 84%, rgba(0, 0, 0, 0.22) 100%);
}
.book-hard .spine-light {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 14%, rgba(0, 0, 0, 0) 80%, rgba(0, 0, 0, 0.1)),
    linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0, rgba(0, 0, 0, 0.05) 10%, rgba(255, 255, 255, 0.2) 30%, rgba(255, 255, 255, 0.03) 54%, rgba(0, 0, 0, 0.1) 86%, rgba(0, 0, 0, 0.34) 100%);
}
.book-cloth .spine-light {
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.05) 0 1px, rgba(0, 0, 0, 0.03) 1px 2px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.26) 0, rgba(0, 0, 0, 0.04) 10%, rgba(255, 255, 255, 0.12) 30%, rgba(255, 255, 255, 0.02) 54%, rgba(0, 0, 0, 0.08) 86%, rgba(0, 0, 0, 0.3) 100%);
}
/* A read paperback: fine reading creases down the spine */
.spine-creased .spine-light {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0) 24%, rgba(255, 255, 255, 0.26) 25%, rgba(255, 255, 255, 0) 28%, rgba(255, 255, 255, 0) 69%, rgba(255, 255, 255, 0.18) 70%, rgba(255, 255, 255, 0) 73%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 16%, rgba(0, 0, 0, 0) 78%, rgba(0, 0, 0, 0.1)),
    linear-gradient(90deg, rgba(0, 0, 0, 0.16) 0, rgba(255, 255, 255, 0.12) 9%, rgba(255, 255, 255, 0) 38%, rgba(0, 0, 0, 0.03) 84%, rgba(0, 0, 0, 0.22) 100%);
}

.band { position: absolute; left: 0; right: 0; height: calc(var(--band) * var(--s)); }
.band-top { top: 0; }
.band-bottom { bottom: 0; }

.spine-text {
  position: absolute; left: 0; right: 0;
  top: calc(var(--pt) * var(--s)); bottom: calc(var(--pb) * var(--s));
  display: flex; justify-content: space-between; align-items: center;
  writing-mode: vertical-rl;
}
.spine-title, .spine-author { flex: 0 0 auto; }
.spine-title { display: block; }
.spine-title.has-label { padding: 4px 1.5px; border-radius: 0.5px; }
.line { display: block; white-space: nowrap; font-size: calc(var(--fs) * var(--s)); line-height: 1.15; }
.spine-author { opacity: 0.92; }

/* Plain bent-steel bookend, edge-on */
.bookend {
  position: relative; flex: 0 0 3px; width: 3px; margin-left: 2px;
  height: calc(78px * var(--s));
  border-radius: 2px 2px 0 0;
  background: linear-gradient(90deg, #f4f3ec, #dddcd0 55%, #c4c3b6);
  box-shadow: 4px 1px 5px rgba(30, 28, 20, 0.16);
}
.bookend::after {
  content: ''; position: absolute; left: 100%; bottom: 0; width: 13px; height: 2px;
  border-radius: 0 1px 0 0;
  background: linear-gradient(#fbfaf8, #dddcd5);
  box-shadow: 0 1px 1px rgba(30, 28, 20, 0.18);
}

/* ---------- Selected book ---------- */
/* Stays in view at the bottom of the window while the shelves scroll past */
.entry-details {
  display: grid; grid-template-columns: 76px 1fr; gap: 22px; align-items: start;
  position: sticky; bottom: 0; z-index: 5;
  margin-top: 12px; padding: 16px 32px 16px 0; min-height: 150px;
  background: #fff;
}
.close {
  appearance: none; -webkit-appearance: none;
  position: absolute; top: 10px; right: -6px;
  display: grid; place-items: center; width: 28px; height: 28px;
  margin: 0; padding: 0; border: 0; border-radius: 50%; background: none;
  color: #888; cursor: pointer;
}
.close:hover { color: #222; background: #f2f2f0; }
.close:focus-visible { outline: 2px solid #333; outline-offset: 1px; }
.cover { display: block; width: 100%; height: auto; border-radius: 1px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14), 2px 4px 10px rgba(0, 0, 0, 0.1); }
.cover img { display: block; width: 100%; height: auto; }

/* ---------- Small phones ---------- */
@media (max-width: 374px) {
  .wall { --s: 0.63; }
}
@media (max-width: 359px) {
  .wall { --s: 0.55; }
}
@media (max-width: 450px) {
  .entry-details { grid-template-columns: 60px 1fr; gap: 16px; }
}
/* Phones: the details are a sheet across the bottom of the screen, not part of the column */
@media (max-width: 600px) {
  .entry-details {
    position: fixed; left: 0; right: 0; bottom: 0;
    margin: 0; min-height: 0;
    padding: 14px 44px calc(14px + env(safe-area-inset-bottom)) 16px;
    border-top: 1px solid #e6e5e0;
    box-shadow: 0 -6px 18px rgba(30, 28, 20, 0.08);
  }
  .entry-details .description {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .close { top: 8px; right: 8px; }
}

/* ---------- Two bays side by side: one continuous shelf line ----------
   606 bays are 912mm or 667mm between E-track centres. The outer rails sit half a rail
   in from each end, so the run between them is split 912 : 667. */
@media (min-width: 601px) {
  .wall { --s: 0.62; padding: 0 28px; }
  .system { flex-direction: row; flex-wrap: wrap; max-width: none; }
  .bay-a { flex: 0 0 calc((100% - 13px) * 912 / 1579 + 13px); }
  .bay-b { flex: 0 0 calc((100% - 13px) * 667 / 1579 + 13px); margin-left: -13px; }
  .bay-b .upright-l { display: none; }
  /* Shelves stack in pairs; the rails run unbroken from the top pair to the bottom one */
  .bay, .bay.m-first, .bay.m-last { padding-top: 12px; padding-bottom: 18px; }
  .bay.d-first { padding-top: 46px; }
  .bay.d-last { padding-bottom: 42px; }
  .bay .upright { top: 0; bottom: -1px; }
  .bay.d-first .upright { top: 18px; }
  .bay.d-last .upright { bottom: 16px; }
  .bay .upright .rail-cap { display: none; }
  .bay.d-first .upright .rail-cap { display: inline; }
  /* Both trays hang at the same height on the shared E-track; bays overlap 13px so the 17px joint holds one rail with a 2px gap either side, its top and bottom ends inside the wall. */
}

/* Full column: the outer rails line up with the edges of the text column */
@media (min-width: 660px) {
  .wall { --s: 0.76; padding: 0; }
}
/* This site's column is 720px against the original's 600px: same shelf, scaled up to fill it */
@media (min-width: 768px) {
  .wall { --s: 0.91; }
}
/* The wall itself runs 18px past the rails on each side, the same as the gap above them */
@media (min-width: 700px) {
  .wall { margin: 0 -18px; padding: 0 18px; }
  /* The details cover the wall edge to edge; their content stays on the text column */
  .entry-details { margin-left: -18px; margin-right: -18px; padding-left: 18px; padding-right: 50px; }
  .close { right: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .book { transition: none; }
}
</style>
