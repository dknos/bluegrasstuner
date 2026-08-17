/**
 * WORLD 3. CHORD SHOP
 *
 * Eleven microlessons, all of them the same move repeated: put a note on top
 * of the note a third above it, and keep going. Triad, seventh chord,
 * extensions. Nothing here is a new mechanism, only a longer stack.
 *
 * Two things this world tries hard to do.
 *
 * 1. Build rather than memorise. A learner who knows what a minor third is can
 *    derive every chord in the file, so no lesson asks anyone to remember a
 *    note list. The four triad qualities are presented as one-note edits of
 *    each other, and the four common sevenths as one-note edits after that.
 *
 * 2. Keep spelling honest. A diminished seventh has a double flat in it, an
 *    augmented triad has a raised fifth and not a minor sixth, and the lessons
 *    say so rather than smoothing it over. Every example is a recipe the
 *    engine resolves, so the spelling comes from the same letter arithmetic as
 *    the rest of the course and is correct in all twelve keys.
 */

import { defineLesson, defineWorld } from './schema.js';

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w3-l1-stacked-thirds',
  world: 3,
  index: 1,
  minutes: 5,
  title: 'Two Thirds, One Chord',
  subtitle: 'What a triad is, and why the stack is made of thirds',
  teaches: ['triad'],
  requires: ['third', 'perfect-family'],

  depths: {
    quick: `A triad is three notes stacked in thirds: a root, the note two letters above it, and the note two letters above that.`,

    normal: `Take a note. Add the note a third above it, then add another third on top of
      that. Three notes, each one skipping a letter, and the outer two turn out to be a
      perfect fifth apart. That stack is a triad, and almost all Western harmony is made of
      it. Nothing in the recipe is new. You are piling up intervals you already measured in
      World 1.`,

    deep: `Thirds are the only stack that works this well, and the alternatives show you
      why. Build a three-note chord out of seconds and the notes sit close enough to grind
      against each other, so the ear hears a smear where a chord should be. Try fourths and you
      get something open and non-committal, with no third in it to say
      whether the chord is bright or dark. Thirds land in the useful middle: wide enough
      that each note stays audible, narrow enough to blend, and two of them stacked arrive
      on the perfect fifth, which is the most stable interval short of the octave. A triad is
      therefore a solid frame with a colour inside it.`,

    nerd: `The word triad is stricter than it looks. It means three notes stacked in
      thirds, so any old three-note collection is a trichord, and sus2 and sus4 chords are
      called triads only by courtesy since neither one contains a third. The usual
      justification for the triad is the harmonic series: the first five partials of a low
      C give C, C, G, C and E, which is a major triad with the root appearing three times. Quartal
      harmony, built from stacked fourths, is a genuine alternative rather than a mistake,
      and Debussy, Bartók and McCoy Tyner all leaned on it. One more caveat worth carrying:
      calling the triad the smallest complete chord is a teaching convenience. Jazz
      pianists play rootless voicings constantly, and two notes over a bass player is
      plenty of chord for anybody.`,
  },

  steps: {
    why: {
      text: `You can name every interval on the keyboard and still not play a single chord,
        because a chord is a decision about which intervals to pile on top of one another.
        Only a few answers sound like anything. One of them accounts for nearly everything
        you will ever meet on a page.`,
    },

    hear: {
      text: `Three notes, one after another, then all at once. Each one is a third above
        the note below it.`,
      example: { kind: 'chord', chordId: 'major' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The same chord on the staff. Three noteheads on three consecutive lines or
        three consecutive spaces, because every note in the stack skips a letter. Learn
        that shape and you can spot a triad on a page without reading a single name.`,
      example: { kind: 'chord', chordId: 'major' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'interval-builder',
        prompt: `Build a three-note stack out of seconds. Then out of thirds, then out of fourths.
          Play each one before you move on to the next.`,
        noticing: `Seconds crowd into a cluster and fourths float without committing to
          anything. Only the stack of thirds sounds like a chord you recognise, and only
          that one puts a perfect fifth between the outer notes.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'interval',
        controls: ['letter-slider', 'accidental-step', 'play', 'compare', 'reset'],
        example: { kind: 'stack', intervals: ['P1', 'M3', 'P5'] },
      },
    },

    name: {
      term: 'Triad',
      text: `Three notes a third apart. The bottom note is the root, the middle one is the
        third and the top one is the fifth, and those names stay attached to the notes
        whatever order you end up playing them in. Root position means the root is the
        lowest note.`,
      symbol: '1 3 5',
      alsoCalled: ['three-note chord', 'root position triad'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `Build the triad on the root you are given.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        difficulty: 3,
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Root, skip a letter, third, skip a letter, fifth. If two of your three
          notes share a letter, one of them is spelled wrong.`,
      },
    },

    apply: {
      text: `Build a triad on each note of a major scale using only notes from that scale
        and you get seven chords without choosing any of them. That is where the chords of
        a key come from. They will not all be the same quality, which is what the next two
        lessons are about.`,
      task: `Play the stack below, then move it up one scale step at a time, keeping every
        note inside the scale. Some of them will come out darker than others. Notice which.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Some of these are built in thirds and some have had a note swapped out.
          Which is which?`,
        reps: 8,
        asks: 'same-different',
        mode: 'visual',
        difficulty: 3,
        pool: { kind: 'chord', ids: ['major', 'minor', 'sus4', 'sus2'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `A sus chord has a fourth or a second where the third should be, so it is
          a triad in name only. With no third in it, it cannot tell you whether it is major
          or minor, which is the entire point of the sound.`,
      },
    },

    review: {
      takeaways: [
        `A triad is a root, a third above it, and another third above that.`,
        `Stacking thirds puts a perfect fifth across the outside, which is what makes the
          chord sound solid.`,
        `On the page a triad is three noteheads in a row, all on lines or all in spaces.`,
      ],
      next: `Two triads can share their outer notes and sound like opposite emotions. One
        note is doing it.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w3-l2-major-and-minor-triads',
  world: 3,
  index: 2,
  minutes: 4,
  title: 'One Note Decides',
  subtitle: 'Major and minor triads, a half step apart',
  teaches: ['triad'],
  requires: ['triad', 'major-minor-quality'],

  depths: {
    quick: `Major and minor triads differ by one note: the third sits four half steps above the root in one and three in the other.`,

    normal: `Stack a major third and then a minor third and you get a major triad. Reverse
      the order, minor first, and you get a minor triad. Root and fifth are
      identical in both, so the whole difference is the middle note, and the two versions of
      it are one half step apart. That single note is why a piece sounds bright or
      shadowed.`,

    deep: `Because the outer fifth never moves, the fifth carries no information about
      quality at all; it is structural, holding the chord up. Everything expressive is in
      the third. Those words bright and dark deserve some suspicion, though. A major triad
      has simpler frequency ratios, roughly 4:5:6, against roughly 10:12:15 for the minor
      one, so there is a real acoustic difference underneath the impression. The emotional
      reading laid on top is learned rather than given, and plenty of music outside the
      European tradition uses minor thirds with no trace of sadness anywhere near them.`,

    nerd: `Spelling stays strict here even where the sound does not care. A minor triad on
      F sharp is F sharp, A, C sharp, because the middle note has to be some kind of third
      and therefore some kind of A. Write B double flat instead and you have the same three
      keys and a chord nobody can read. There is also a long history of trying to make the
      minor triad symmetrical with the major one by deriving it downward from an undertone
      series, which sounds elegant and has no acoustic basis; Riemann and his followers
      spent decades on it. The practical upshot is that the major triad appears in the
      harmonic series of its own root and the minor triad does not, and yet every ear that
      has heard music since about 1400 hears both as consonances.`,
  },

  steps: {
    why: {
      text: `Two chords built on the same note, sharing two of their three notes, can sound
        like completely different pieces of music. The note that differs is the third, and
        the difference is a single half step. Very little else in music does this much with
        so little.`,
    },

    hear: {
      text: `A minor triad, arpeggiated and then in one block. Hold the sound in your head.
        Two steps from now a widget will move one note of it and the whole chord will
        change colour.`,
      example: { kind: 'chord', chordId: 'minor' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `A major triad this time, with the intervals marked from the root. Major third
        at the bottom, minor third above it, perfect fifth across the outside. Swap those
        two thirds over and the chord is minor.`,
      example: { kind: 'chord', chordId: 'major' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'quality-shifter',
        prompt: `Move the middle note up a half step and back down again. Play the whole
          chord each time rather than the note on its own.`,
        noticing: `The chord swaps between minor and major and nothing else has to move.
          Compare how little the note changes with how much the chord does.`,
        views: ['piano', 'pitchring', 'staff'],
        labelMode: 'interval',
        controls: ['accidental-step', 'play', 'compare', 'tonic-picker', 'reset'],
        example: { kind: 'chord', chordId: 'minor' },
      },
    },

    name: {
      term: 'Major and minor triads',
      text: `Major triad: root, major third, perfect fifth, and its symbol is just the root
        name with nothing after it. Minor triad: root, minor third, perfect fifth, written
        with a small m. Older charts use a dash instead of the m, and some classical writing
        puts the whole chord name in lower case.`,
      symbol: 'maj / m',
      alsoCalled: ['major chord', 'minor chord'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Major or minor?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 1,
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `If the block chord will not give it up, sing the bottom note and then the
          middle one. You are listening for a third, and you already know how to name one.`,
      },
    },

    apply: {
      text: `Songwriters swap a major chord for the minor version of the same chord
        constantly, and the borrowing runs in both directions. The chord keeps its place in
        the key and changes its mood, which is a cheap way to make a repeated section land
        differently the second time round.`,
      task: `Play a major triad twice, then the minor version twice, then go back. The bass
        note never moved, so nothing about where you are has changed.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Spell the triad you are asked for. Several of these roots need accidentals
          to keep the thirds the right size.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Count letters first and fix the accidental afterwards. A minor triad on B
          is B, D, F sharp, because the top note has to be some kind of F.`,
      },
    },

    review: {
      takeaways: [
        `Major is a major third with a minor third on top. Minor is the same two intervals
          the other way up.`,
        `Root and fifth are identical in both, so the third does all the work.`,
        `One half step in the middle changes the chord's name and its mood together.`,
      ],
      next: `Leave the third alone and move the fifth instead. Two more chords fall out of
        it.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w3-l3-diminished-and-augmented',
  world: 3,
  index: 3,
  minutes: 5,
  title: 'Squash It, Stretch It',
  subtitle: 'Diminished and augmented triads',
  teaches: ['triad'],
  requires: ['triad', 'tritone'],

  depths: {
    quick: `Squash the fifth and the triad is diminished. Stretch it and the triad is augmented.`,

    normal: `A triad contains two thirds and each one can be major or minor, so there are
      four combinations. Major and minor chords use one of each. The other two use the same
      kind twice. Two minor thirds give a diminished triad, whose outer interval is a
      tritone, and two major thirds give an augmented triad, whose outer interval is a half
      step wider than a perfect fifth. Both sound unsettled, for different reasons.`,

    deep: `The diminished triad is tense because of the tritone between its root and its
      fifth, and a tritone has nowhere to rest. It appears on the seventh degree of any
      major scale, a half step under the tonic, leaning hard upward. Augmented triads are
      unsettled for a stranger reason: they are symmetrical. Two major thirds are the same
      size, and a third one would land back on the root, so the octave is cut into three
      equal pieces and no note has a better claim to being home than the other two. Play an
      augmented triad, then play it again starting from its middle note. Same keys, and
      your ear cannot tell which version was supposed to be the chord.`,

    nerd: `Spelling is where these two catch people out. An augmented fifth is written as a
      raised fifth, so an augmented triad on C ends on G sharp and never on A flat, because
      the top note has to be some kind of fifth and A is a sixth. The diminished triad gets
      the same treatment with a flattened fifth. Because the augmented triad divides the
      octave evenly there are only four distinct ones in the whole system, each carrying
      three possible names, and nineteenth-century composers used exactly that ambiguity to
      slide between distant keys. The diminished triad has no such symmetry, since a minor
      third plus a minor third plus an augmented fourth does not repeat. In practice you
      meet it with a seventh added or with its third in the bass, because on its own it
      sounds thin.`,
  },

  steps: {
    why: {
      text: `Every chord so far has had a perfect fifth holding it together. Take that away
        and the chord loses its floor. Both of the chords here exist to go somewhere rather
        than to sit still, and both turn up constantly the moment music stops being
        simple.`,
    },

    hear: {
      text: `Two minor thirds, one on top of the other. The outer notes are six half steps
        apart, which you met in World 1 as the interval with no home.`,
      example: { kind: 'chord', chordId: 'diminished' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The other one, on the page and on the ring. Three notes cutting the circle into
        three equal arcs, and a top note written as a raised fifth rather than a flattened
        sixth.`,
      example: { kind: 'chord', chordId: 'augmented' },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'accidental-lab',
        prompt: `Start from the major triad. Lower the third, then lower the fifth as well.
          Put both back, then raise the fifth on its own.`,
        noticing: `Four chords, each one a single half step from its neighbour. Lowering the
          third gives minor, lowering the fifth as well gives diminished, and raising the
          fifth of the major chord gives augmented.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'interval',
        controls: ['accidental-step', 'play', 'compare', 'spelling-toggle', 'reset'],
        example: { kind: 'chord', chordId: 'major' },
      },
    },

    name: {
      term: 'Diminished and augmented triads',
      text: `Diminished triad: root, minor third, diminished fifth. Write it dim, or with a
        small circle. Augmented triad: root, major third, augmented fifth, written aug or
        with a plus sign. Neither one contains a perfect fifth. That is why neither sounds
        like a place you could stop.`,
      symbol: 'dim / aug',
      alsoCalled: ['diminished chord', 'augmented chord'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Four qualities in play now. Which one is this?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 2,
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'augmented'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Check the outside of the chord first. If the outer interval sounds
          stable, you are choosing between major and minor and the third decides. When it does
          not, you are choosing between squashed and stretched.`,
      },
    },

    apply: {
      text: `Build a triad on the seventh degree of a major scale using only notes from the
        scale and a diminished triad appears without anyone asking for one. That is where
        the chord lives in tonal music, a half step under the tonic and pulling toward it.`,
      task: `Play the stack below, then play the tonic triad of the same scale straight
        after it. The diminished chord should sound like it had been leaning that way the
        whole time.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [7, 9, 11] },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Spell these, and mind the fifth.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        difficulty: 3,
        pool: { kind: 'chord', ids: ['diminished', 'augmented'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `An augmented triad on E flat ends on B natural, not C flat. Whatever the
          accidental turns out to be, the top note keeps the letter a fifth above the root.`,
      },
    },

    review: {
      takeaways: [
        `Two minor thirds make a diminished triad, and two major thirds make an augmented one.`,
        `Neither has a perfect fifth in it, so neither sounds settled.`,
        `The augmented triad splits the octave evenly, which leaves it with no obvious root.`,
      ],
      next: `Same three notes, different note at the bottom. The chord survives. Its
        character does not.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w3-l4-inversions',
  world: 3,
  index: 4,
  minutes: 6,
  title: 'Whoever Is On the Bottom',
  subtitle: 'Chord inversions and what actually changes',
  teaches: ['chord-inversion'],
  requires: ['triad', 'interval-inversion'],

  depths: {
    quick: `Move the lowest note of a triad up an octave and you have inverted it: same chord, same name, different note in the bass.`,

    normal: `A chord is a set of notes, and nothing says the root has to be the lowest one.
      Move the root up an octave and the third is now in the bass. Do it again and the fifth
      is. Those are first and second inversion, and the chord is still the same chord with
      the same name. What changes is the weight: root position sounds planted, first
      inversion sounds lighter, and second inversion sounds like it is leaning on
      something.`,

    deep: `Work out the intervals above the bass and the difference stops being mysterious.
      Root position gives you a third and a fifth above the bass, both stable. First
      inversion has the third at the bottom with a third and a sixth above it, which is why
      the chord sounds like a triad with a sixth in it and moves more easily. Second
      inversion puts the fifth in the bass and leaves a fourth above it, and a fourth above
      the bass has been treated as unstable for something like five hundred years of
      Western practice. That is a convention rather than physics, but composers wrote to it
      for long enough that the sound carries the association. The practical reason
      inversions exist is the bass line: rearranging chords lets the lowest voice move by
      step instead of leaping after every root.`,

    nerd: `Classical notation numbers inversions by the intervals above the bass, which is
      where the figures 6 and 6/4 come from; written in full they would be 5/3, 6/3 and 6/4,
      and the redundant numbers get dropped. Lead sheets do it differently, writing the
      chord, a slash and the bass note, and slash notation is the more general of the two
      because the bass note does not have to belong to the chord at all. Two details worth
      carrying away. Inverting a chord never changes its root, so the analysis stays put
      while the sound moves; and the ear is not always convinced, since a second-inversion
      major triad is genuinely ambiguous and can be heard as a different chord with an added
      fourth. Classical writing hedges that chord about with rules. Pop writing mostly
      avoids it.`,
  },

  steps: {
    why: {
      text: `Real music almost never leaves chords sitting in a neat stack of thirds. Play a
        few bars of anything and the notes are spread out, doubled, and in an order that has
        nothing to do with how the chord was built. It is still the same chord. Which note
        is at the bottom is what tells you why it sounds different.`,
    },

    hear: {
      text: `A major triad in root position, arpeggiated and then as a block. This is the
        reference. Everything that follows is these three notes in another order.`,
      example: { kind: 'chord', chordId: 'major' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The same three notes with the root moved to the top. On the staff the tidy
        snowman has gone, and the gap between the middle note and the top note is now a
        fourth. That fourth is how you spot a first inversion by eye.`,
      example: { kind: 'stack', intervals: ['M3', 'P5', 'P8'] },
      views: ['staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'inversion-mirror',
        prompt: `Take the lowest note of the chord and move it up an octave. Do it again.
          Then once more, and look at where you have arrived.`,
        noticing: `Three moves bring the chord back to where it started, an octave higher.
          No note changed its name. The chord never changed its name either, and neither did
          its root. Only the bass moved, and the whole feel of the thing moved with it.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'interval',
        controls: ['invert', 'play', 'compare', 'octave-shift', 'reset'],
        example: { kind: 'chord', chordId: 'major' },
      },
    },

    name: {
      term: 'Inversion',
      text: `Root position has the root in the bass, first inversion has the third there and
        second inversion has the fifth. On a chart the bass note is written after a slash,
        so a C major triad with an E underneath it is written C/E and said as C over E.`,
      symbol: 'chord / bass note',
      alsoCalled: ['slash chord', 'first inversion', 'second inversion'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Root position, first inversion or second inversion?`,
        reps: 10,
        asks: 'invert',
        mode: 'visual',
        difficulty: 2,
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        views: ['staff', 'piano'],
        labelMode: 'interval',
        feedback: `Look for the fourth. Root position has none. First inversion has it
          between the top two notes, second inversion between the bottom two.`,
      },
    },

    apply: {
      text: `Inversions are how a bass line gets to move by step under chords whose roots
        jump around. A progression that leaps from one root to another can be smoothed out
        by inverting the second chord, and the harmony is untouched.`,
      task: `Play two triads a fourth apart in root position and listen to the bass leap.
        Then play the second chord in first inversion so the bass moves by step instead.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Build the chord with the note you are given at the bottom.`,
        reps: 8,
        asks: 'invert',
        mode: 'visual',
        difficulty: 3,
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `A diminished triad in first inversion is the one place that chord sounds
          comfortable, which is why classical writing uses it far more often than the
          root-position version.`,
      },
    },

    review: {
      takeaways: [
        `Inverting means moving the lowest note up an octave. The chord keeps its name and
          its root.`,
        `First inversion puts the third in the bass, second inversion puts the fifth there.`,
        `What changes is the set of intervals above the bass, and that is what you hear.`,
      ],
      next: `Back to stacking. One more third on top of the triad and the chord starts
        having opinions.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w3-l5-one-more-third',
  world: 3,
  index: 5,
  minutes: 5,
  title: 'Add a Fourth Third',
  subtitle: 'Seventh chords, and the two choices inside them',
  teaches: ['seventh-chord'],
  requires: ['triad', 'seventh'],

  depths: {
    quick: `Put one more third on top of a triad and you have a seventh chord, four notes deep.`,

    normal: `Stacking does not have to stop at three notes. Add another third above the
      fifth and you land on a seventh above the root, which gives a four-note chord. On the
      staff it is the same picture with one more notehead on the next line or space up. What
      the extra note buys you is a second opinion inside the chord: the triad underneath
      says major or minor, and the seventh on top says how badly the chord wants to move.`,

    deep: `Two independent choices are now in play. The triad can be major, minor,
      diminished or augmented, and the seventh can be major, minor or diminished, so on
      paper there are a dozen combinations. Six get used enough to have names. Four of those
      account for nearly everything: a major triad with a major seventh, a major triad with
      a minor seventh, a minor triad with a minor seventh, and a diminished triad with
      either kind of lowered seventh. Each of the next four lessons takes one of them and
      gets it into your ear, because telling them apart by sound is the skill that makes a
      chord chart readable and the skill almost everybody skips.`,

    nerd: `The naming is a mess, and it helps to know it is a mess rather than assume you
      have misunderstood something. Major seventh describes the interval on top. Minor
      seventh describes the triad and the interval, which happen to agree. Dominant seventh
      describes neither, being named after the scale degree the chord usually sits on, and
      it keeps that name wherever else it appears. Half-diminished describes a chord that is
      diminished in its triad and not in its seventh. Nobody designed this. It accumulated
      across several languages over about three hundred years, and working musicians simply
      learn the six names as vocabulary and get on with it.`,
  },

  steps: {
    why: {
      text: `Triads are the first half of the story. Most of the harmony in jazz, soul,
        bossa nova, gospel and film scoring is four notes deep, and the fourth note is what
        gives a chord somewhere to go. Adding it is the same move you have already made
        twice.`,
    },

    hear: {
      text: `A triad you know, then one more third on top of it. Listen for the point where
        the chord stops sounding plain and starts sounding like a record.`,
      example: { kind: 'stack', intervals: ['P1', 'M3', 'P5', 'M7'] },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The four notes as scale degrees: one, three, five, seven. Every other note of
        the scale, and on the staff four noteheads climbing in a straight line.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 7] },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'staff-plotter',
        prompt: `Add a note a third above the top of this triad. Place it on the next line
          or space up rather than counting half steps.`,
        noticing: `The fourth note continues the pattern exactly. Chord tones sit on
          alternate staff positions, so a seventh chord is four lines or four spaces, and
          anything breaking that pattern is either spelled wrong or not a chord tone.`,
        views: ['staff', 'piano'],
        labelMode: 'name',
        controls: ['letter-slider', 'accidental-step', 'play', 'compare', 'reset'],
        example: { kind: 'chord', chordId: 'major' },
      },
    },

    name: {
      term: 'Seventh chord',
      text: `A triad with a fourth note a third above the fifth, which puts it a seventh
        above the root. The chord is named for what the triad is and what the seventh is,
        and the shorthand puts a 7 somewhere in the symbol. Four notes is the standard chord
        size in most jazz and popular writing.`,
      symbol: '1 3 5 7',
      alsoCalled: ['four-note chord', 'tetrad'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Three notes or four?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['major', 'minor', 'maj7', 'dom7', 'min7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Do not try to name the quality yet. A triad sounds clean and closed, while a
          seventh chord has something extra rubbing gently inside it.`,
      },
    },

    apply: {
      text: `A chart that says C and a chart that says Cmaj7 are asking for different
        chords, and a player who treats them as interchangeable will be wrong in one
        direction or the other. The seventh is part of the chord rather than decoration on
        top of it.`,
      task: `Play a triad, add the note a third above its top note, and play it again. Do
        that on several roots until the extra note stops sounding like a mistake.`,
      example: { kind: 'chord', chordId: 'maj7' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Build the four-note chord you are asked for, and spell the seventh
          properly.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['maj7', 'dom7', 'min7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `The seventh always takes the letter one below the root's own letter. On D
          that is some kind of C, whatever accidental the quality turns out to need.`,
      },
    },

    review: {
      takeaways: [
        `A seventh chord is a triad with one more third stacked on top.`,
        `The triad and the seventh are chosen separately, which is where all the different
          names come from.`,
        `All four notes sit on alternate lines or spaces, so the staff shape stays regular.`,
      ],
      next: `Four sevenths, one lesson each, until you can tell them apart with your eyes
        shut.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w3-l6-major-seventh',
  world: 3,
  index: 6,
  minutes: 4,
  title: 'The One That Stays',
  subtitle: 'Major seventh chords',
  teaches: ['seventh-chord'],
  requires: ['seventh-chord'],

  depths: {
    quick: `A major seventh chord is a major triad with the note a half step below the octave root sitting on top.`,

    normal: `Take a major triad and add a major third above the fifth. The top note lands
      eleven half steps above the root, one half step short of the octave, and the chord
      goes from plain to lush. It does not push anywhere. A major seventh chord is somewhere
      you can stop, which is why so much music ends on one rather than on a bare triad.`,

    deep: `The odd part is that the interval doing the work is the same half step that
      sounds harsh everywhere else. Between the seventh and the root an octave above sits a
      minor second, which on its own is the roughest sound on the keyboard. Spread those two
      notes an octave and a bit apart and the roughness turns into a shimmer. Spacing
      decides everything here. Voice the seventh directly under the root, both of them in
      the middle of the piano, and the chord sounds like a mistake; give the seventh some
      air above the chord and it glows. There is no tritone anywhere in a major seventh
      chord, which is the other half of why it rests instead of pushing.`,

    nerd: `Symbols for this chord are the least standardised in common use. Maj7, M7, a
      triangle, and a triangle with a 7 after it all mean the same thing, and the one thing
      that never means it is a bare 7, which always means a dominant chord. Reading the
      triangle as shorthand for major-anything will eventually land you on a chart where it
      means this chord specifically. Two relatives are worth meeting while you are here. A
      minor triad with a major seventh on top is a minor-major seventh, the tonic chord of
      harmonic minor, and it sounds like a spy film. Raise the fifth of a major seventh chord
      and you get the same lush sound with the floor taken out. Both are rare enough that you can leave
      them for later without losing anything.`,
  },

  steps: {
    why: {
      text: `Chord charts distinguish between a chord written as a plain letter and one
        written with a seven after it, and the difference is audible from across the room.
        This is the first of the four sevenths, and the one that sounds least like anything
        needs to happen next.`,
    },

    hear: {
      text: `Four notes, arpeggiated and then together. Nothing in the block chord asks to
        move on.`,
      example: { kind: 'chord', chordId: 'maj7' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The intervals from the root, marked: major third, perfect fifth, major seventh.
        On the ring the top note sits one position short of the root coming back round.`,
      example: { kind: 'chord', chordId: 'maj7' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'compound-collapse',
        prompt: `Fold the top note down an octave so it sits right beside the root, then
          send it back up. Play the whole chord both ways.`,
        noticing: `Down beside the root the seventh grinds, because the two notes are a half
          step apart. An octave higher it is the same pair of note names and the chord
          sounds lit from behind. Where you put a note changes what it does.`,
        views: ['piano', 'staff'],
        labelMode: 'interval',
        controls: ['octave-fold', 'play', 'compare', 'octave-shift', 'reset'],
        example: { kind: 'chord', chordId: 'maj7' },
      },
    },

    name: {
      term: 'Major seventh chord',
      text: `Root, major third, perfect fifth, major seventh. Written maj7, M7 or with a
        triangle. It is what you get by taking the first, third, fifth and seventh degrees of
        a major scale straight off the shelf, which is part of why it sounds like home.`,
      symbol: 'maj7',
      alsoCalled: ['major 7th', 'triangle chord'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Plain major triad, or major seventh?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['major', 'maj7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Listen for a faint shimmer above the chord. If it sounds completely
          plain, there is no seventh in it.`,
      },
    },

    apply: {
      text: `Ending on a major seventh instead of a triad is one of the quickest ways to
        make a progression stop sounding like an exercise. It also changes what can follow,
        since a chord already at rest sets nothing up.`,
      task: `Play a progression that ends on a major triad, then play it again ending on the
        major seventh version of the same chord. Decide which ending suits what you are
        playing.`,
      example: { kind: 'chord', chordId: 'maj7' },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Major seventh, or the other bright four-note chord?`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['maj7', 'dom7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Both have a major third, so the third will not help you. One rests and
          one leans. If you can pick out the top note, ask whether it is a half step or a
          whole step below the octave.`,
      },
    },

    review: {
      takeaways: [
        `Major seventh chord: major triad plus a major seventh.`,
        `The half step between the seventh and the root is what you are hearing, and spacing
          decides whether it shimmers or grinds.`,
        `No tritone anywhere in it, so the chord rests.`,
      ],
      next: `Flatten that top note by one half step and the chord stops resting.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w3-l7-dominant-seventh',
  world: 3,
  index: 7,
  minutes: 6,
  title: 'The One That Leaves',
  subtitle: 'Dominant sevenths and the tritone inside them',
  teaches: ['seventh-chord'],
  requires: ['seventh-chord', 'tritone'],

  depths: {
    quick: `A dominant seventh is a major triad with a minor seventh, and the tritone hiding inside it is what makes the chord move.`,

    normal: `Lower the seventh of a major seventh chord by a half step and the whole
      character changes. The top note now sits ten half steps above the root instead of
      eleven, and the chord goes from settled to impatient. What causes it is a pair of notes
      in the middle: the third and the seventh are exactly six half steps apart, which is a
      tritone, and a tritone wants to resolve. On a chart this chord is the root name with a
      plain 7 after it and nothing else.`,

    deep: `Play the third and the seventh on their own. That pair is the engine, and the
      rest of the chord is scenery around it. When a dominant seventh resolves, the tritone
      comes apart in two directions at once: the third rises a half step and the seventh
      falls a half step, landing on the root and the third of the chord a fourth above.
      Everything World 5 has to say about cadences is that movement in different clothes.
      Worth stating plainly, though: the classical account of this chord as pure tension is
      not the whole truth. Blues and rock treat dominant sevenths as resting chords that can
      sit for twelve bars without going anywhere, and nothing about that sounds broken.
      Context decides whether tension gets discharged or enjoyed.`,

    nerd: `Two dominant sevenths whose roots are a tritone apart contain the same tritone,
      with the third and seventh swapping jobs. That is the whole basis of tritone
      substitution, and it is why a chart can replace one dominant with another from an
      apparently unrelated key and have it sound inevitable. The seventh in this chord also
      has a tuning history. Up in the harmonic series, the seventh partial sits noticeably
      flatter than the minor seventh a keyboard gives you, and singers and brass players lean toward
      that flatter note on a dominant chord, which is why a barbershop quartet or a big band
      section locks in a way a piano never quite manages. The blues seventh lives somewhere
      in the same region, which is one reason blues notation has always been an
      approximation.`,
  },

  steps: {
    why: {
      text: `Harmony that goes somewhere needs a chord that cannot stay where it is. This is
        that chord. It has been doing the job in nearly every Western style since about
        1700, and it does it with two of its four notes.`,
    },

    hear: {
      text: `The same major triad as last lesson with the top note lowered a half step.
        Listen to how differently the block chord finishes.`,
      example: { kind: 'chord', chordId: 'dom7' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `On the ring, two of the four notes sit directly opposite each other. Those are
        the third and the seventh, six half steps apart, and they are the reason the chord
        will not sit still.`,
      example: { kind: 'chord', chordId: 'dom7' },
      views: ['pitchring', 'piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'tritone-mirror',
        prompt: `Find the two notes sitting opposite each other on the ring and play only
          those. Then swap which one is on the bottom.`,
        noticing: `That pair is a tritone either way up, and it sounds unfinished either way
          up. Put the other two notes back and the chord inherits the restlessness from
          them.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'interval',
        controls: ['invert', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'chord', chordId: 'dom7' },
      },
    },

    name: {
      term: 'Dominant seventh chord',
      text: `Root, major third, perfect fifth, minor seventh. Written as the root name with
        a 7 and nothing else, so a plain 7 in a symbol always means this chord. The name
        comes from the fifth degree of a scale, called the dominant, where the chord appears
        without being altered. It keeps the name wherever else it turns up.`,
      symbol: '7',
      alsoCalled: ['dom7', 'the seven chord'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Dominant seventh or major seventh?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['maj7', 'dom7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `One sounds finished and one sounds like a question. If you are stuck,
          hold the root in your head and listen to the top note against it.`,
      },
    },

    apply: {
      text: `A dominant seventh built a fifth above a chord is the standard way of
        announcing that chord before you arrive at it. Most cadences, most turnarounds and
        most key changes are that announcement being made.`,
      task: `Play a dominant seventh, then move its third up a half step and its seventh
        down a half step and hold what is left. You have resolved to the chord a fourth
        higher.`,
      example: { kind: 'chord', chordId: 'dom7' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Spell these. The seventh is the note that catches people.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['dom7', 'maj7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `On B the dominant seventh is A natural, not A sharp. Ten half steps above
          the root, and always the letter below the root's letter.`,
      },
    },

    review: {
      takeaways: [
        `Dominant seventh: major triad plus a minor seventh.`,
        `Its third and seventh are a tritone apart, which is what makes the chord restless.`,
        `Resolving it means moving those two notes a half step in opposite directions.`,
        `Blues treats the same chord as a place to sit, so the tension is a convention
          rather than a law.`,
      ],
      next: `Keep the flattened seventh and put a minor triad underneath it.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w3-l8-minor-seventh',
  world: 3,
  index: 8,
  minutes: 4,
  title: 'The One That Sits There',
  subtitle: 'Minor sevenths, and a chord with two names',
  teaches: ['seventh-chord'],
  requires: ['seventh-chord'],

  depths: {
    quick: `A minor seventh chord is a minor triad with a minor seventh on top, and there is no tritone anywhere in it.`,

    normal: `Minor triad, minor seventh. The chord has a minor third at the bottom and a
      perfect fifth between its third and its seventh, and nowhere inside it are two notes a
      tritone apart. That absence is what you hear. The chord comes out smooth, slightly
      cool, and perfectly content to sit still for as long as you leave it. Whole records
      have been built on two of these alternating.`,

    deep: `Set it against the dominant seventh and the difference is one note: the third,
      lowered a half step. That single change removes the tritone and with it any obligation
      to go somewhere. It is why a minor seventh works as a resting place in modal music,
      where one chord can run for a page, and why it works as an opening move in a
      two-five-one, handing over to a dominant that does have somewhere to be. The chord
      also contains the same four pitches as a major sixth chord built a minor third below
      it. Which one you hear depends entirely on the bass, which is an early demonstration
      that a bass note decides what a set of pitches means.`,

    nerd: `The overlap with the sixth chord is exact: a minor seventh chord on A holds the
      notes of a major sixth chord on C, and no analysis of the pitches alone can separate
      them. Arrangers exploit that, reinterpreting a voicing mid-phrase by moving the bass
      under it. Symbols vary more than they should here as well, with m7, min7, mi7, -7 and
      occasionally a lower case letter all in circulation; the dash form is common enough in
      older jazz charts to be worth recognising on sight. The relative to watch for is the
      minor triad with a major seventh on top, which looks like a typo and is not. It comes
      out of harmonic minor and sounds nothing like this chord.`,
  },

  steps: {
    why: {
      text: `Two of the four sevenths pull hard. This one does not, and knowing which chords
        rest is as useful as knowing which ones move, because a progression made entirely of
        tension never arrives anywhere.`,
    },

    hear: {
      text: `Four notes with nothing inside them arguing. Play it twice and it still sounds
        like it could stay.`,
      example: { kind: 'chord', chordId: 'min7' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The intervals from the root: minor third, perfect fifth, minor seventh. Check
        the ring for two notes sitting directly opposite one another. There are none.`,
      example: { kind: 'chord', chordId: 'min7' },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'interval-ear',
        prompt: `Listen to the chord before you look at anything. Decide whether it wants to
          move, then reveal the intervals and check what you decided.`,
        noticing: `Where the dominant has a tritone between its third and its seventh, this
          chord has a perfect fifth. Nothing in it is pulling, which is exactly what you
          heard before any labels appeared.`,
        views: ['piano', 'pitchring'],
        labelMode: 'interval',
        controls: ['reveal', 'play', 'compare', 'tonic-picker', 'reset'],
        example: { kind: 'chord', chordId: 'min7' },
      },
    },

    name: {
      term: 'Minor seventh chord',
      text: `Root, minor third, perfect fifth, minor seventh. Written m7 or min7, and in
        older charts with a dash before the 7. It is the most-used four-note chord in modern
        harmony and the least demanding of them.`,
      symbol: 'm7',
      alsoCalled: ['min7', 'minor 7th'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Three chords in play: major seventh, dominant seventh, minor seventh.`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['maj7', 'dom7', 'min7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Find the third first. Dark third and the chord is the minor seventh.
          Bright third and you are deciding whether the top note rests or leans.`,
      },
    },

    apply: {
      text: `A minor seventh, then a dominant seventh a fourth above it, then a major
        seventh a fourth above that, is the most common three-chord sequence in jazz. Every
        chord in it is one you can now build from scratch.`,
      task: `Play those three chords in that order and listen to the middle one doing all
        the work. Then play the first two on repeat and notice that the sequence never
        settles.`,
      example: { kind: 'chord', chordId: 'min7' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `These two chords hold the same four notes. Only the bass note tells you
          which one you are hearing.`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['min7', '6'] },
        views: ['piano', 'staff'],
        labelMode: 'none',
        feedback: `A minor seventh chord and the major sixth chord a minor third below it
          are the same pitches. Whichever note is at the bottom is the one your ear takes as
          the root.`,
      },
    },

    review: {
      takeaways: [
        `Minor seventh chord: minor triad plus a minor seventh.`,
        `No tritone in it, so it rests rather than pulls.`,
        `It shares all four notes with a major sixth chord a minor third lower, and the bass
          decides which one you hear.`,
      ],
      next: `Two chords left, both built on a diminished triad, and one of them needs a
        double flat.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w3-l9-squeezed-sevenths',
  world: 3,
  index: 9,
  minutes: 6,
  title: 'Squeezed Sevenths',
  subtitle: 'Half-diminished and diminished seventh chords',
  teaches: ['seventh-chord'],
  requires: ['seventh-chord', 'tritone'],

  depths: {
    quick: `Put a minor seventh on a diminished triad and you get a half-diminished chord; lower it again and you get a diminished seventh.`,

    normal: `A diminished triad can take either of two sevenths. Adding a minor seventh
      gives the half-diminished chord, written m7♭5 or with a slashed circle, and that
      flattened seventh softens the triad considerably. Lower the same note one more half
      step and every gap in the chord becomes a minor third. That is the diminished seventh,
      and it is the tensest chord in common use.`,

    deep: `Half-diminished chords have one tritone, between the root and the flattened
      fifth, and the seventh sits a comfortable distance above everything else. The result
      is dark rather than desperate, and it is the standard chord on the second degree of a
      minor key, where its job is to set up the dominant. Diminished sevenths are a
      different animal. Four notes stacked in minor thirds cut the octave into four equal
      pieces, so the chord is symmetrical, every inversion of it is another diminished
      seventh, and any of its four notes can be heard as the root. That symmetry means only
      three distinct diminished seventh chords exist in the entire system, and composers
      have used the ambiguity to change key abruptly since Bach.`,

    nerd: `Spelling is the famous part. A diminished seventh has to be a stack of thirds, so
      the top note is a diminished seventh above the root, which on C means B double flat and
      not A. Your fingers cannot tell the difference. The page can, and the analysis
      underneath depends on it. Most editions cheat when the double flats get unreadable, and
      it is worth knowing that the cheat is a cheat rather than the rule. Two more facts earn
      their keep here. Lower any single note of a diminished seventh by a half step and you
      land on a dominant seventh chord, which is why this chord is often analysed as a
      dominant seventh flat nine with the root missing. And the two symbols for the
      half-diminished chord encode two ways of thinking: the slashed circle files it under
      diminished, while m7♭5 files it under minor sevenths with one note bent down.`,
  },

  steps: {
    why: {
      text: `Chords built on a diminished triad turn up constantly in minor keys and in any
        music that changes key often. They also contain the last spelling trap in this
        world, which involves writing a note with two flats in front of it and meaning
        exactly that.`,
    },

    hear: {
      text: `A diminished triad with a minor seventh over the top. Darker than a minor
        seventh chord, and far less frantic than the chord it is about to be compared
        with.`,
      example: { kind: 'chord', chordId: 'half-dim7' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The diminished seventh on the page and on the ring. Four evenly spaced points,
        a stack of minor thirds, and a top note written as a seventh whatever accidental
        that takes.`,
      example: { kind: 'chord', chordId: 'dim7' },
      views: ['staff', 'pitchring', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'enharmonic-flip',
        prompt: `Look at the top note of the chord and switch its spelling between the two
          names for that key. Play the chord after each switch and check whether anything
          changed.`,
        noticing: `The sound is identical and only one of the spellings keeps the chord as a
          stack of thirds. Respell it and the chord still plays, but it stops looking like a
          chord and the analysis underneath it falls over.`,
        views: ['staff', 'piano'],
        labelMode: 'name',
        controls: ['spelling-toggle', 'play', 'compare', 'reveal', 'reset'],
        example: { kind: 'chord', chordId: 'dim7' },
      },
    },

    name: {
      term: 'Half-diminished and diminished sevenths',
      text: `Half-diminished: diminished triad with a minor seventh, written m7♭5 or with a
        slashed circle. Diminished seventh: diminished triad with a diminished seventh,
        written dim7 or with a small circle. One is a working chord in minor keys. The other
        is a hinge, used to get somewhere else.`,
      symbol: 'm7♭5 / dim7',
      alsoCalled: ['ø7', '°7', 'minor seven flat five'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Half-diminished, diminished seventh, or plain minor seventh?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['min7', 'half-dim7', 'dim7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `The diminished seventh is the one with no room in it anywhere. Between
          the other two, listen to the fifth: in the half-diminished chord it sounds bent
          downward.`,
      },
    },

    apply: {
      text: `A diminished seventh chord works as a pivot. Because it can be heard four ways,
        it can lead to four different places, and a piece can arrive somewhere unrelated to
        where it set off without the listener feeling ambushed.`,
      task: `Play the chord below, then lower any one of its four notes by a half step and
        listen to what you get. Whichever note you pick, you land on a dominant seventh.`,
      example: { kind: 'chord', chordId: 'dim7' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Spell these, double flats and all.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['half-dim7', 'dim7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Count letters first, then fix the accidentals. Four notes, four different
          letters, each one skipping the letter below it.`,
      },
    },

    review: {
      takeaways: [
        `Half-diminished is a diminished triad with a minor seventh. Lower that note again
          and the chord is a diminished seventh.`,
        `A diminished seventh is four stacked minor thirds, so it is symmetrical and has four
          possible roots.`,
        `Its top note is spelled as a seventh, which is where the double flats come from.`,
      ],
      next: `You can build every chord on a chart now. Reading the chart is next.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L10 = defineLesson({
  id: 'w3-l10-chord-symbols',
  world: 3,
  index: 10,
  minutes: 6,
  title: 'Reading the Shorthand',
  subtitle: 'Chord symbols, and what they refuse to tell you',
  teaches: ['chord-symbols'],
  requires: ['seventh-chord', 'enharmonic-spelling'],

  depths: {
    quick: `A chord symbol is a compressed recipe: root, then quality, then anything extra, then a bass note after a slash.`,

    normal: `Chord symbols are written to be read at speed by somebody who is already
      playing. A letter on its own means a major triad, and a small m means minor. Put a 7
      there by itself and you have a dominant seventh, never a major seventh, which has to
      say maj7 or use a triangle. Anything after a slash goes in the bass. The symbol tells you which notes
      are in the chord and says nothing about octave, order or spacing, because those are
      the player's business.`,

    deep: `Reading a symbol is a decoding job in a fixed order: root, then the quality of
      the triad, then the seventh, then extensions and alterations, then the bass note.
      Writing one is the same job backwards, with an extra decision that beginners usually
      get wrong. The root has to be spelled the way the key spells it. A chart in E major
      writes G sharp seven, because G sharp is how that key spells its third degree, and the
      same sound written A flat seven makes every reader hesitate for a bar. Enharmonic
      choices are not free. They tell the reader where a chord came from, and a symbol that
      argues with the key signature costs more time than it saves.`,

    nerd: `No standards body owns this notation and it shows. One minor seventh chord can
      appear as Cm7, Cmin7, Cmi7, C-7 and occasionally as a lower case c with a 7, across
      charts you might be handed on the same evening. Diminished is dim or a small circle,
      augmented is aug or a plus, half-diminished is a slashed circle or m7♭5. A chord with
      an added second and no seventh has to be written add9 rather than 9, because a plain 9
      promises a seventh underneath it. Symbols can subtract as well: no3 and no5 show up on
      guitar charts, and slash chords are routinely used for a bass note that belongs to no
      part of the chord. When a chart is ambiguous the working convention is to play what
      fits the tune, which is unsatisfying as a rule and is what everybody actually does.`,
  },

  steps: {
    why: {
      text: `Almost no music you will play from a page spells its chords out note by note.
        It hands you a symbol and expects you to build the chord yourself, in whatever
        register and order suits your instrument. The system is small, slightly inconsistent
        and learnable in one sitting.`,
    },

    hear: {
      text: `Four notes, and a symbol four characters long that asks for exactly these.
        Everything else about how it gets played was left to whoever is playing it.`,
      example: { kind: 'chord', chordId: 'min7' },
      playback: 'chord',
    },

    see: {
      text: `A chord whose symbol has to work harder. Either a slashed circle or m7♭5, both meaning
        these four notes, and the choice of spelling tells you how the writer was thinking
        about the chord.`,
      example: { kind: 'chord', chordId: 'half-dim7' },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Build the chord the symbol asks for by clicking keys, in any octave and any
          order you like. Then build it again with a different note at the bottom.`,
        noticing: `Every voicing you can find satisfies the symbol, as long as the note
          names are right and the slash note is underneath when there is one. A symbol
          constrains what, not where.`,
        views: ['piano', 'staff'],
        labelMode: 'name',
        controls: ['play', 'octave-shift', 'label-mode', 'tonic-picker', 'reset'],
        example: { kind: 'chord', chordId: 'dom7' },
      },
    },

    name: {
      term: 'Chord symbol',
      text: `Root, quality, extras, slash bass, in that order. A bare letter is a major
        triad, m is minor, dim and aug are the squashed and stretched triads, a plain 7 is
        dominant, maj7 is the major seventh and a slashed circle is half-diminished.
        Everything else is assembled out of those parts.`,
      symbol: 'root · quality · extras · /bass',
      alsoCalled: ['lead sheet symbol', 'chart notation'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Which set of notes is this symbol asking for?`,
        reps: 10,
        asks: 'construct',
        mode: 'visual',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7', 'maj7', 'min7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Read it in order: root, then triad quality, then the seventh if there is
          one. A bare 7 is always dominant.`,
      },
    },

    apply: {
      text: `Handed a chart, a player reads the symbol, picks a voicing that suits the
        instrument and the register, and rarely plays the notes in the order the symbol
        implies. The gap between the symbol and the sound is where arranging happens.`,
      task: `Take one symbol and play it four ways: close together, spread wide, with the
        third in the bass, and with the fifth left out entirely. All four are correct
        readings of the same symbol.`,
      example: { kind: 'chord', chordId: 'dom7' },
    },

    challenge: {
      drill: {
        kind: 'spell',
        prompt: `Same sound, two spellings. Which one is written the way the key wants it?`,
        reps: 8,
        asks: 'spelling',
        mode: 'visual',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['dom7', 'maj7', 'min7', 'half-dim7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `A chord root is spelled the way the key spells that degree. Sharps in
          sharp keys, flats in flat keys, and a chord whose letters argue with the key
          signature costs the reader a bar.`,
      },
    },

    review: {
      takeaways: [
        `A symbol names note names and a bass note, and leaves voicing to the player.`,
        `Seven on its own always means dominant. Major sevenths have to spell themselves out.`,
        `The root is spelled the way the key spells it, so the enharmonic choice carries
          information.`,
      ],
      next: `One more thing a symbol can tell you: what is going on above the seventh.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L11 = defineLesson({
  id: 'w3-l11-extensions',
  world: 3,
  index: 11,
  minutes: 7,
  title: 'Keep Stacking',
  subtitle: 'Ninths, elevenths, thirteenths and the notes that fight',
  teaches: ['extensions'],
  requires: ['seventh-chord', 'compound-interval'],

  depths: {
    quick: `Carry on stacking thirds past the seventh and you arrive at the ninth, the eleventh and the thirteenth.`,

    normal: `Above the seventh the stack keeps going. Another third takes you to the ninth,
      then the eleventh, then the thirteenth, and one more would land back on the root. The
      numbers count past eight because these notes sit above the seventh rather than beside
      the root, so a ninth is a second an octave up and a thirteenth is a sixth an octave up.
      That is the entire system, and it explains every number you have ever seen on a chart.`,

    deep: `A number above seven in a symbol promises the notes underneath it. Write 9 and you have
      promised a seventh as well, which is why a chord with an added second and no seventh
      has to be written add9 instead. Past that, the three extensions behave differently from one
      another, and the differences are practical. Ninths and thirteenths sit comfortably over
      almost anything. The eleventh does not: a perfect eleventh is a fourth, and a fourth
      sitting above a major third leaves a half step clash that most ears reject, so on major
      and dominant chords the eleventh is usually raised or the third is dropped. Minor
      chords have no such problem. A minor third and an eleventh sit a whole step apart
      rather than a half step, so nothing grates.`,

    nerd: `Written out in full, a thirteenth chord holds root, third, fifth, seventh, ninth,
      eleventh and thirteenth, which is seven notes, which is the whole scale. Nobody plays
      that. Players drop the fifth first, then the root if there is a bass player, and often
      the eleventh, keeping the third and the seventh because that pair carries the chord's
      identity. On dominant chords extensions can also be altered on purpose: flat nine,
      sharp nine, sharp eleven and flat thirteen each add a specific colour and each implies
      a scale to improvise from. The sharp nine deserves naming, since you have heard it a
      thousand times. It sets a raised ninth against a major third, which is both thirds of
      the chord sounding at once, and it is the reason that chord always sounds like a guitar
      solo about to start. The word tension for these notes is Berklee vocabulary; classical
      writing calls them added dissonances or unresolved appoggiaturas and analyses them
      along completely different lines.`,
  },

  steps: {
    why: {
      text: `Chord symbols count up to thirteen and then stop, which looks arbitrary until
        you see where the numbers come from. They are the same stack of thirds you have been
        building all through this world, carried on past the point where it fits inside one
        octave.`,
    },

    hear: {
      text: `A major seventh chord with one more third on top. The extra note is high enough
        to read as colour rather than as another structural part of the chord.`,
      example: { kind: 'chord', chordId: 'maj9' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The stack taken to its limit: seven notes, each a third above the last, and
        between them the whole scale. On the ring every position belonging to the key lights
        up, which is exactly why nobody plays all of these at once.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 7, 9, 11, 13] },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Add the extensions one at a time and watch which scale degrees they land
          on. Then take the third out of the chord and put the eleventh back.`,
        noticing: `The ninth is the second, the eleventh is the fourth and the thirteenth is
          the sixth, each of them an octave higher. Only the eleventh fights, and it stops
          fighting the moment the third is gone.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'degree',
        controls: ['play', 'tonic-picker', 'label-mode', 'compare', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 7, 9, 11, 13] },
      },
    },

    name: {
      term: 'Extensions',
      text: `The ninth, eleventh and thirteenth: the notes you reach by carrying the stack of
        thirds above the seventh. A number above seven in a symbol implies a seventh
        underneath, and altered extensions carry their accidental in the symbol, as in flat
        nine or sharp eleven.`,
      symbol: '9 11 13',
      alsoCalled: ['tensions', 'colour tones', 'upper structure'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Seventh chord on its own, or a seventh chord with something above it?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['maj7', 'maj9', 'dom7', 'dom9', 'min7', 'min9'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `You are listening for width rather than for one particular note. An
          extension puts air above the chord without changing what the chord is doing.`,
      },
    },

    apply: {
      text: `Extensions are how a pianist makes three chords sound like an arrangement. A
        chord's job in the progression does not change when you add a ninth to it, so you
        can add and remove them freely without breaking anything underneath.`,
      task: `Play a seventh chord, then add the note a ninth above the root and play it
        again. Then fold that ninth down an octave so it sits beside the root, and listen to
        what you lose.`,
      example: { kind: 'chord', chordId: 'dom9' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Ninth, eleventh or thirteenth on top?`,
        reps: 6,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['dom9', 'dom7sharp11', 'dom13', 'maj9'] },
        views: ['piano', 'staff'],
        labelMode: 'none',
        feedback: `Fold the top note down into the octave above the root and name it as a
          simple interval. A ninth is a second, an eleventh is a fourth, a thirteenth is a
          sixth.`,
      },
    },

    review: {
      takeaways: [
        `Ninth, eleventh and thirteenth are the next thirds up the stack.`,
        `A number above seven promises a seventh underneath it, and add9 is how you say you
          do not want one.`,
        `The eleventh clashes with a major third, so either it gets raised or the third gets
          dropped.`,
      ],
      next: `World 4 takes these chords, puts them in a key, and gives each one a job.`,
    },
  },
});

// ---------------------------------------------------------------------------

export const WORLD_3 = defineWorld({
  id: 'world-3',
  number: 3,
  title: 'Chord Shop',
  tagline: 'Stack thirds until it sounds like something',
  blurb: `Eleven lessons built on one move: put a note on top of the note a third above it,
    and keep going. Three notes gives you a triad and four qualities that are one half step
    apart from each other. Four notes gives you the sevenths, one lesson each until you can
    tell them apart by ear. After that, the shorthand on a chart and the notes that live
    above the seventh.`,
  lessons: [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11],
});

export default WORLD_3;
