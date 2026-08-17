/**
 * WORLD 1 — INTERVAL LAB
 *
 * Eleven microlessons on distance. This is the world the rest of the course is
 * built on: a scale is a pattern of intervals, a chord is a stack of them, a
 * key signature is what happens when you insist on the same pattern starting
 * somewhere else.
 *
 * The crux is lesson 2. An interval is measured twice at the same time — once
 * in letter names, once in half steps — and almost every persistent confusion
 * later in a musician's life comes from having quietly collapsed those two
 * measurements into one. It gets its own lesson, its own widget, and it is
 * repeated in the `deep` depth of every lesson after it.
 *
 * As in World 0, no example holds notes. Every one is a recipe the theory
 * engine builds, so the whole world works in any key.
 */

import { defineLesson, defineWorld } from './schema.js';

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w1-l1-what-is-an-interval',
  world: 1,
  index: 1,
  minutes: 4,
  title: 'The Distance Is the Music',
  subtitle: 'What an interval is, and why it matters more than the notes',
  teaches: ['interval'],
  requires: ['half-step', 'musical-alphabet'],

  depths: {
    quick: `An interval is the distance between two pitches, and it is what you actually recognise when you recognise a tune.`,

    normal: `Play two notes and the gap between them is an interval. It does not matter
      whether you play them one after another or together, or which one is higher. What
      makes intervals worth a whole world of lessons is this: move both notes up by the
      same amount and the interval is unchanged, and so is the tune. Listeners recognise
      distances, not pitches.`,

    deep: `Almost nobody can identify a pitch on its own. Absolute pitch is rare and,
      musically, not very important. What everyone has is relative pitch: the ability to
      hear how far apart two notes are. That is why a song sung in a different key is
      still the same song, why a guitarist with a capo has not changed the music, and why
      a melody played on a bass and on a flute is recognisably the same melody despite
      sharing no actual pitches. Intervals are the layer where music is stored, and notes
      are just one possible rendering of them.`,

    nerd: `The ear responds to frequency ratios, not differences. The distance from 200 Hz
      to 300 Hz sounds like the same interval as 400 Hz to 600 Hz, even though one gap is
      100 Hz and the other is 200 Hz, because both are a 3:2 ratio. Pitch perception is
      roughly logarithmic, which is what makes equal temperament possible: divide the
      octave into twelve equal multiplications rather than twelve equal additions and
      every key behaves the same way. This also explains why a semitone at the bottom of
      a piano is a much larger gap in Hz than one at the top, and yet counts as the same
      interval.`,
  },

  steps: {
    why: {
      text: `Nothing you have learned so far explains why one tune sounds happy and
        another sounds tense, because a single note has almost no character on its own.
        Everything expressive in music happens between notes, and the between is what an
        interval measures.`,
    },

    hear: {
      text: `Two notes. Listen to the gap rather than to either one of them.`,
      example: { kind: 'interval', intervalId: 'P5' },
      playback: 'pair',
    },

    see: {
      text: `The same two notes on the keyboard and on the pitch ring. The ring shows the
        distance directly, as the arc between them.`,
      example: { kind: 'interval', intervalId: 'P5' },
      views: ['piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Pick any two notes and listen. Now move both of them up by the same
          number of keys and listen again. Then move only one.`,
        noticing: `Moving both by the same amount leaves the sound of the gap intact.
          Moving one changes it completely. On the fretboard the pair keeps the same shape
          wherever you slide it, which is the same fact stated by an instrument.`,
        views: ['piano', 'pitchring', 'fretboard'],
        labelMode: 'semitones',
        controls: ['play', 'tonic-picker', 'octave-shift', 'label-mode', 'reset'],
        example: { kind: 'interval', intervalId: 'P5' },
      },
    },

    name: {
      term: 'Interval',
      text: `The distance between two pitches. Every interval in this course gets two
        pieces of information (a number and a quality, such as "major third"), and the
        next lesson explains where both of them come from.`,
      alsoCalled: ['distance', 'the gap'],
    },

    practice: {
      drill: {
        kind: 'order',
        prompt: `Put these gaps in order, smallest to largest, by ear.`,
        reps: 6,
        asks: 'interval-size',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['m2', 'M3', 'P5', 'P8'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `You are not naming anything yet. Only judging which gap is wider.`,
      },
    },

    apply: {
      text: `A melody is a list of intervals with a starting note attached. Change the
        starting note and keep the intervals and you have transposed it: same tune,
        different key, which is exactly what a singer does when a song sits too high.`,
      task: `Play the short figure below, then play it again starting from a different
        note while keeping every gap the same size. It should still be recognisable.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 3, 1] },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Two versions of the same short figure. Are the distances identical, or
          has one of them been altered?`,
        reps: 6,
        asks: 'same-different',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['M2', 'M3', 'P4', 'P5'] },
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        feedback: `Compare gap by gap. A figure moved wholesale is the same; a figure with
          one gap resized is not.`,
      },
    },

    review: {
      takeaways: [
        `An interval is the distance between two pitches.`,
        `Move both notes by the same amount and the interval survives.`,
        `Tunes are stored as intervals, which is why any key works.`,
      ],
      next: `Every interval is measured twice at once. That idea is the whole next lesson.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w1-l2-two-numbers',
  world: 1,
  index: 2,
  minutes: 7,
  title: 'Two Rulers at Once',
  subtitle: 'Counting letters and counting half steps',
  teaches: ['interval-number', 'two-number-rule'],
  requires: ['interval', 'accidentals'],

  depths: {
    quick: `Every interval is measured twice: letters give it a number, half steps give it a size.`,

    normal: `To name an interval you ask two separate questions. First, how many letter
      names does it span, counting both ends? C up to E covers C, D, E (three letters), so
      it is some kind of third. Second, how many half steps is it actually? C up to E is
      four, and four half steps in a third means major. Number comes from letters. Quality
      comes from half steps. Neither one alone is enough.`,

    deep: `The reason for two rulers is that the two things they measure are genuinely
      different. Letters tell you what an interval does: a third looks like a third on the
      page, stacks into chords like a third, and behaves like a third in a scale. Half
      steps tell you what it sounds like. Usually they agree, but they can come apart: C up
      to D sharp and C up to E flat are both three half steps and sound identical, yet one
      spans two letters and the other spans three. One is an augmented second, the other a
      minor third. Same sound, different intervals, different jobs. If you only counted
      half steps you would be unable to tell them apart, and every chord you spelled from
      then on would eventually come out wrong.`,

    nerd: `The letter count is deliberately inclusive, which is why a third spans two
      steps and not three, and why intervals do not add cleanly: a third plus a third is a
      fifth, not a sixth, because the shared middle note gets counted twice. If you want
      arithmetic that behaves, subtract one from each number, add, then add one back.
      Semitone counts do add normally, which is another sign that these are two different
      measuring systems bolted together. The engine behind this course stores a note as
      letter plus alteration plus octave precisely so it can run both counts independently;
      it will also refuse to name a gap that no standard quality covers, such as the
      distance from B sharp up to A double flat, rather than inventing a symbol nobody
      uses.`,
  },

  steps: {
    why: {
      text: `Two notes can sound exactly the same distance apart and still be two
        different intervals with two different names. That sounds like a bureaucratic
        detail. It is the single idea that makes chord and scale spelling make sense, and
        skipping it is why so many people find theory arbitrary.`,
    },

    hear: {
      text: `Three notes: a starting note, then two notes that sound identical to each
        other. They are the same key. They are not the same interval.`,
      example: { kind: 'stack', intervals: ['P1', 'm3', 'A2'] },
      playback: 'sequence',
    },

    see: {
      text: `Now look at the staff. The two notes that sounded identical sit on different
        lines, because they use different letters, and that is what changes the interval
        number.`,
      example: { kind: 'stack', intervals: ['P1', 'm3', 'A2'] },
      views: ['staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'two-number-meter',
        prompt: `Choose two notes and watch both readouts: letters spanned on one side,
          half steps on the other. Now change the accidental on the upper note without
          changing its letter.`,
        noticing: `Changing an accidental moves the half-step count but leaves the letter
          count alone. The interval keeps its number and changes its quality.`,
        views: ['staff', 'piano', 'pitchring'],
        labelMode: 'interval',
        controls: ['letter-slider', 'accidental-step', 'play', 'label-mode', 'reset'],
        example: { kind: 'ladder' },
      },
    },

    name: {
      term: 'Number and quality',
      text: `The number counts letter names inclusively: unison, 2nd, 3rd, 4th and so on.
        The quality (major, minor, perfect, augmented, diminished) says how many half
        steps that span actually contains. Written together they give "M3" or "m6" or
        "P5", which is the shorthand used everywhere from here on.`,
      symbol: 'M3 m6 P5',
      alsoCalled: ['interval number', 'interval quality'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Count the letters first, then the half steps. Give both numbers before
          you name anything.`,
        reps: 10,
        asks: 'interval-name',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['M2', 'm3', 'M3', 'P4', 'P5'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Include both end notes when counting letters. C to E is three letters,
          not two.`,
      },
    },

    apply: {
      text: `This is why a minor chord contains a flattened third rather than a raised
        second, even though those are the same key. The chord is built by stacking thirds,
        so the middle note has to be a kind of third, or the chord stops looking like a
        chord on the page.`,
      task: `Look at the chord below and check the letters: root, skip a letter, next,
        skip a letter, next. Every chord tone lands on its own line or its own space.`,
      example: { kind: 'chord', chordId: 'minor' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Some of these pairs sound identical. Name each one exactly, using the
          letters to decide the number.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['m3', 'A2', 'M3', 'd4'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `If the sound is the same and the letters differ, the interval differs.
          Trust the letters for the number, the half steps for the quality.`,
      },
    },

    review: {
      takeaways: [
        `Number comes from counting letters, including both ends.`,
        `Quality comes from counting half steps.`,
        `Two intervals can sound identical and still be different intervals.`,
      ],
      next: `Now the intervals themselves, starting with the smallest useful one.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w1-l3-seconds',
  world: 1,
  index: 3,
  minutes: 4,
  title: 'Seconds Are Just Steps',
  subtitle: 'The interval you already know under a different name',
  teaches: ['second'],
  requires: ['two-number-rule', 'whole-step'],

  depths: {
    quick: `A second joins neighbouring letters: minor if it is one half step, major if it is two.`,

    normal: `Two adjacent letters make a second. If the gap is one half step it is a minor
      second; if it is two half steps it is a major second. You have already been playing
      these: a whole step is a major second and a half step between two different letters
      is a minor second. The new part is the name, and the fact that the name now depends
      on the letters as well as the sound.`,

    deep: `Seconds are how melodies mostly move, because stepwise motion is easy to sing
      and easy to follow. They are also the interval that sounds worst played together: two
      notes a half step apart are close enough to interfere with each other and produce a
      rough, beating quality. That roughness is not a defect to be avoided. It is the
      tension that makes a suspension or a leading tone work. Notice too that a minor
      second and an augmented unison are the same number of half steps: one moves to a new
      letter, the other stays on the same letter. Sound identical, behave completely
      differently.`,

    nerd: `The augmented second is the second's most interesting edge case. Three half
      steps but only two letters, it appears in harmonic minor between the flat sixth
      degree and the raised seventh, and it is the sound most people mean when they call
      something "exotic". It is not a minor third, even though it plays on the same key,
      because in that context both surrounding notes have already claimed their letters.
      There is also a diminished second (two letters, zero half steps, as in E sharp up to
      F natural), which is a real interval in the naming system and simply silence-inducing
      in equal temperament, since both notes are the same key. It survives because notation
      needs it to describe some enharmonic modulations.`,
  },

  steps: {
    why: {
      text: `Scales are made of seconds and melodies are mostly made of seconds, so this
        is the interval you will meet more than any other. It is also the easiest place to
        watch the number-and-quality system do its work.`,
    },

    hear: {
      text: `A starting note, then a minor second above it, then a major second. One half
        step, then two.`,
      example: { kind: 'stack', intervals: ['P1', 'm2', 'M2'] },
      playback: 'sequence',
    },

    see: {
      text: `Both seconds on the staff. They sit on neighbouring positions. That is what
        makes them seconds. Only the accidental differs.`,
      example: { kind: 'stack', intervals: ['P1', 'm2', 'M2'] },
      views: ['staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Walk up a major scale one note at a time and check the size of every step
          you take.`,
        noticing: `Every step is a second, but they are not all the same size. Five are
          major seconds and two are minor seconds, and the two small ones are what give
          the scale its shape.`,
        views: ['piano', 'staff'],
        labelMode: 'interval',
        controls: ['play', 'direction', 'label-mode', 'tonic-picker', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Major and minor second',
      text: `Minor second: adjacent letters, one half step. Major second: adjacent letters,
        two half steps. In older or British texts they are the semitone and the tone.`,
      symbol: 'm2 / M2',
      alsoCalled: ['half step', 'whole step', 'semitone', 'tone'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Minor second or major second?`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['m2', 'M2'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `The minor second sounds squeezed, almost like one note wobbling. The
          major second sounds like the opening of a scale.`,
      },
    },

    apply: {
      text: `A scale is nothing but a specific order of major and minor seconds. Once you
        can hear which is which, you can work out a scale by ear one step at a time.`,
      task: `Play a major scale and stop at each note to decide whether the step you just
        took was a major or a minor second. You should find exactly two minor seconds.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `One of these is not a second at all, even though it is only a half step.
          Name each one properly.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['m2', 'M2', 'A1'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Same letter twice means a unison, however big the accidental makes it.
          The number always comes from the letters.`,
      },
    },

    review: {
      takeaways: [
        `Neighbouring letters make a second.`,
        `One half step is minor, two is major.`,
        `A half step on the same letter is an augmented unison, not a second.`,
      ],
      next: `Skip a letter instead of stepping to it, and you get the interval that decides
        the mood of everything.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w1-l4-thirds',
  world: 1,
  index: 4,
  minutes: 6,
  title: 'Thirds Decide the Mood',
  subtitle: 'The interval that makes music sound bright or dark',
  teaches: ['major-minor-quality', 'third'],
  requires: ['second'],

  depths: {
    quick: `A third skips one letter: four half steps sounds bright and is major, three sounds dark and is minor.`,

    normal: `Count three letters (C, D, E) and skip the middle one when you play. That is
      a third. Four half steps makes it major and it sounds open and bright; three half
      steps makes it minor and it sounds shadowed. One half step of difference is all that
      separates them, and that one half step is responsible for most of what people mean
      when they call music happy or sad.`,

    deep: `Thirds matter more than other intervals for a structural reason: chords in this
      system are built by stacking them. Take any note, add the note a third above, then
      another third above that, and you have a triad, the smallest complete chord. Because
      the stack is made of thirds, the quality of the lowest third is what decides whether
      the chord is major or minor, and that decision propagates through every piece of
      harmony you will ever analyse. It is also why thirds sound consonant but not hollow:
      their frequency ratios are simple enough to sound smooth, but complex enough to have
      a flavour, unlike the fifth which sounds stable and neutral.`,

    nerd: `Thirds were treated as dissonances in early medieval polyphony and only became
      the basis of harmony later, which is a useful reminder that consonance is partly
      learned. The tuning story is the reason: a pure major third is a 5:4 ratio, and equal
      temperament's major third is about fourteen cents wider: noticeably sharp, and the
      compromise that irritates choirs and barbershop singers, who narrow it back by ear
      when they can. Watch for the enharmonic trap too: a diminished fourth spans four
      letters and four half steps, so it sounds exactly like a major third and is not one.
      It appears in harmonic minor and in any chord where the letters are already spoken
      for.`,
  },

  steps: {
    why: {
      text: `Two chords can share every note but one and sound like completely different
        emotions. The note that differs is almost always the third, and the difference is
        a single half step.`,
    },

    hear: {
      text: `A starting note, then a minor third above it, then a major third. Three half
        steps, then four. Listen for the change in mood rather than the change in height.`,
      example: { kind: 'stack', intervals: ['P1', 'm3', 'M3'] },
      playback: 'sequence',
    },

    see: {
      text: `Both thirds on the staff. They occupy the same position on the page (one
        line, skip a space, next line) because both are thirds. The accidental is the only
        visible difference.`,
      example: { kind: 'stack', intervals: ['P1', 'm3', 'M3'] },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'semitones',
    },

    discover: {
      widget: {
        kind: 'quality-shifter',
        prompt: `Hold the outer notes of a chord still and move only the middle note by one
          half step, up and down.`,
        noticing: `One half step in the middle flips the whole chord between major and
          minor. Nothing else has to move.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'interval',
        controls: ['accidental-step', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'chord', chordId: 'major' },
      },
    },

    name: {
      term: 'Major and minor third',
      text: `Major third: three letters, four half steps. Minor third: three letters, three
        half steps. This pair is where the words major and minor get their everyday
        meaning (bright and dark), and both words go on to name scales and chords built
        around exactly this interval.`,
      symbol: 'M3 / m3',
      alsoCalled: ['the bright third', 'the flat third'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Major third or minor third?`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['m3', 'M3'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `If you cannot hear it in isolation, sing the two notes and then fill in
          the note between them. A major third has two whole steps inside it.`,
      },
    },

    apply: {
      text: `Stack two thirds and you have a triad. Which thirds you stack decides what
        the chord is called: major then minor gives a major chord, minor then major gives a
        minor chord. All of World 3 is this move, repeated.`,
      task: `Build the chord below, then lower its middle note by one half step and listen
        to what happens to the chord as a whole.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Two of these sound like thirds and are not thirds. Use the letters.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['m3', 'M3', 'A2', 'd4'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `An augmented second sounds like a minor third; a diminished fourth
          sounds like a major third. Count letters and the confusion disappears.`,
      },
    },

    review: {
      takeaways: [
        `A third spans three letters and skips the middle one.`,
        `Four half steps is major, three is minor.`,
        `Thirds stack into chords, so the third decides the chord's quality.`,
      ],
      next: `Some intervals refuse to be major or minor at all. That is next.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w1-l5-perfect-family',
  world: 1,
  index: 5,
  minutes: 6,
  title: 'The Ones With No Mood',
  subtitle: 'Unisons, fourths, fifths and octaves',
  teaches: ['perfect-family'],
  requires: ['two-number-rule', 'octave'],

  depths: {
    quick: `Unisons, fourths, fifths and octaves come in one standard size each, so they are called perfect rather than major or minor.`,

    normal: `Not every interval gets a major and a minor version. Unisons, fourths, fifths
      and octaves have only one ordinary size, and that size is called perfect. There is no
      such thing as a major fifth. You can still stretch or squash them by a half step, and
      then they are augmented or diminished, but there is no bright-or-dark choice built
      into them the way there is with thirds and sixths.`,

    deep: `The reason is acoustic. Perfect intervals have the simplest frequency ratios
      available: the octave is 2:1, the fifth close to 3:2, the fourth close to 4:3. Notes
      in those relationships share many overtones, so they blend rather than colour each
      other. A fifth sounds solid and hollow, with no obvious emotional tilt. That
      blending is why medieval polyphony used almost nothing else, why a power chord on a
      distorted guitar is a fifth with the third deliberately left out, and why the fifth
      is the interval instruments are tuned by. Perfect is a description of stability, not
      a value judgement.`,

    nerd: `"Perfect" is inherited terminology from medieval theory, where these intervals
      were the ones permitted as consonances, and the word has survived long after the
      reasoning was abandoned. The fourth is the awkward member: acoustically it is nearly
      as simple as the fifth, but in traditional counterpoint a fourth against the bass was
      treated as a dissonance requiring resolution, and it is still the interval most likely
      to sound unresolved on its own. There is also a tuning wrinkle behind the whole
      family: stack twelve pure fifths and you overshoot seven octaves by about a quarter of
      a semitone, an error called the Pythagorean comma. Equal temperament shrinks every
      fifth very slightly to make the circle close, which is why every fifth you play on a
      keyboard is faintly flat and nobody minds.`,
  },

  steps: {
    why: {
      text: `You have just learned that intervals come in major and minor. Four of them do
        not, and if nobody tells you why, "perfect fifth" sounds like a compliment rather
        than a category.`,
    },

    hear: {
      text: `The tonic, then a fourth, a fifth, and an octave above it. Listen for how
        little emotional colour any of them has compared with a third.`,
      example: { kind: 'stack', intervals: ['P1', 'P4', 'P5', 'P8'] },
      playback: 'sequence',
    },

    see: {
      text: `The same four notes on the ring. The fourth and the fifth sit at mirrored
        positions, which is a hint about something you will meet later in this world.`,
      example: { kind: 'stack', intervals: ['P1', 'P4', 'P5', 'P8'] },
      views: ['pitchring', 'piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'interval-builder',
        prompt: `Try to build a major fifth. Then try a minor fourth. Watch what the
          readout offers you instead.`,
        noticing: `Those qualities are not available on these numbers. Stretch a perfect
          interval and it becomes augmented; squash it and it becomes diminished. There is
          no middle pair of options.`,
        views: ['staff', 'piano', 'pitchring'],
        labelMode: 'interval',
        controls: ['letter-slider', 'accidental-step', 'play', 'label-mode', 'reset'],
        example: { kind: 'stack', intervals: ['P1', 'P4', 'P5', 'P8'] },
      },
    },

    name: {
      term: 'Perfect intervals',
      text: `Unison, fourth, fifth and octave. Their standard size is called perfect, and
        their altered versions are augmented (a half step wider) or diminished (a half step
        narrower). Major and minor never apply to them.`,
      symbol: 'P1 P4 P5 P8',
      alsoCalled: ['the perfect family', 'the stable intervals'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Fourth, fifth, or octave?`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['P4', 'P5', 'P8'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `The octave sounds like the same note. The fifth sounds open and settled.
          The fourth sounds open but slightly unfinished.`,
      },
    },

    apply: {
      text: `Instruments are tuned in perfect intervals because they are the easiest to
        judge by ear: a violin tunes in fifths, a bass in fourths, and a guitar mostly in
        fourths with one third thrown in to make chord shapes reachable.`,
      task: `Play a fifth, then remove the third from a full chord and compare. The chord
        loses its mood entirely and keeps its weight.`,
      example: { kind: 'stack', intervals: ['P1', 'P5', 'P8'] },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Build the named perfect interval above the note given. Some roots will
          need an accidental to keep it perfect.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['P4', 'P5'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `A fifth above B is not F. That gap is a half step too small. It has to
          be some kind of F, so it is F sharp.`,
      },
    },

    review: {
      takeaways: [
        `Unison, fourth, fifth and octave have one ordinary size: perfect.`,
        `Altered, they become augmented or diminished, never major or minor.`,
        `They sound stable because their frequency ratios are simple.`,
      ],
      next: `There is exactly one gap sitting between the fourth and the fifth, and it
        belongs to nobody.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w1-l6-tritone',
  world: 1,
  index: 6,
  minutes: 5,
  title: 'The Interval in the Middle',
  subtitle: 'Six half steps, two names, no home',
  teaches: ['tritone'],
  requires: ['perfect-family'],

  depths: {
    quick: `The tritone is exactly half an octave: six half steps, sitting between the fourth and the fifth and belonging to neither.`,

    normal: `Between the perfect fourth and the perfect fifth there is one gap left over,
      six half steps wide. That is the tritone, and it is exactly half an octave. Spelled
      upward from the fourth it is an augmented fourth; spelled downward from the fifth it
      is a diminished fifth. Same key, two names, and which one you use depends on where
      the notes are going next.`,

    deep: `The tritone is unstable because it is symmetrical. Every other interval divides
      the octave unevenly, which gives one note a claim to being more restful than the
      other. Split the octave exactly in half and neither note wins, so the pair has no
      obvious home and sounds like it is asking a question. That instability is useful, not
      unfortunate; it is the engine of the dominant seventh chord, where the tritone
      between the third and the seventh pulls outward or inward to resolve. Because it is
      symmetrical, it is also the only interval that inverts into itself, which is why it
      is the one interval that never stops sounding like a tritone no matter which note you
      put on the bottom.`,

    nerd: `The name means three whole tones, which is what an augmented fourth literally
      is. The famous story that it was banned by the church as "the devil in music" is
      mostly a nineteenth-century embellishment: medieval theorists did warn against it in
      counterpoint teaching, but as a practical rule about difficulty and voice leading,
      not as a superstition. Two more things worth knowing. First, an augmented fourth and
      a diminished fifth are enharmonic in equal temperament and behave in opposite
      directions: the augmented fourth tends to expand outward to a sixth, the diminished
      fifth to contract inward to a third. Second, because six half steps splits twelve
      evenly, transposing a tritone by a tritone lands you back on the same pair of keys,
      which is the trick behind tritone substitution in jazz harmony.`,
  },

  steps: {
    why: {
      text: `Every interval so far has sounded either stable or mildly coloured. This one
        sounds unresolved on purpose, and once you can hear it you will start noticing it
        inside almost every chord that wants to move somewhere.`,
    },

    hear: {
      text: `Two notes six half steps apart, first one after the other, then together.
        Nothing about it sounds settled.`,
      example: { kind: 'interval', intervalId: 'A4' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `On the ring, the two notes sit exactly opposite each other. That is the whole
        explanation for how the interval behaves.`,
      example: { kind: 'interval', intervalId: 'A4' },
      views: ['pitchring', 'piano', 'staff'],
      labelMode: 'semitones',
    },

    discover: {
      widget: {
        kind: 'tritone-mirror',
        prompt: `Play a tritone, then swap which note is on the bottom. Then transpose the
          whole thing by six half steps.`,
        noticing: `Swapping the notes gives you another tritone. Transposing by a tritone
          gives you the same two keys back. It is the only interval that does either.`,
        views: ['pitchring', 'piano'],
        labelMode: 'interval',
        controls: ['invert', 'play', 'octave-shift', 'compare', 'reset'],
        example: { kind: 'interval', intervalId: 'A4' },
      },
    },

    name: {
      term: 'Tritone',
      text: `Six half steps. Called an augmented fourth when it spans four letters and a
        diminished fifth when it spans five. Both names describe the same keys; the
        spelling records which direction the notes intend to move.`,
      symbol: 'A4 / d5',
      alsoCalled: ['augmented fourth', 'diminished fifth', 'flat five'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Tritone, perfect fourth, or perfect fifth?`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['P4', 'A4', 'P5'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `The tritone is the one that sounds like it has not finished. The other
          two sound like places you could stop.`,
      },
    },

    apply: {
      text: `A dominant seventh chord contains a tritone between its third and its seventh,
        and that tritone is the reason the chord sounds like it needs to resolve. Every
        cadence in World 5 is built on this.`,
      task: `Play the chord below, find the two notes six half steps apart inside it, then
        let them resolve by moving each one a half step in opposite directions.`,
      example: { kind: 'chord', chordId: 'dom7' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Augmented fourth or diminished fifth? The sound will not tell you. Read
          the letters.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['A4', 'd5'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Four letters means an augmented fourth, five letters means a diminished
          fifth, and both are six half steps.`,
      },
    },

    review: {
      takeaways: [
        `Six half steps, exactly half an octave.`,
        `Augmented fourth or diminished fifth depending on the letters.`,
        `Symmetrical, so it has no home and it inverts into itself.`,
      ],
      next: `Back to intervals with a mood. Sixths are next, and they are easier than they
        look.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w1-l7-sixths',
  world: 1,
  index: 7,
  minutes: 5,
  title: 'Sixths Are Wide and Warm',
  subtitle: 'The interval most people already recognise',
  teaches: ['sixth'],
  requires: ['third', 'perfect-family'],

  depths: {
    quick: `A sixth spans six letters: nine half steps is major and open, eight is minor and tender.`,

    normal: `Count six letters and you have a sixth. Nine half steps makes it major, eight
      makes it minor. They are wide intervals, so both notes stay clearly audible rather
      than fusing, which is why sixths sound full without sounding thick. Composers use
      parallel sixths constantly for exactly that reason, and once you have heard a few you
      will start hearing them everywhere.`,

    deep: `The fastest way to get sixths under control is to stop treating them as new.
      Turn a minor third upside down (move the lower note up an octave) and you get a
      major sixth. Turn a major third upside down and you get a minor sixth. So sixths are
      thirds seen from the other side, which means everything you learned about thirds
      transfers: the quality flips, but the flavour is recognisably related. That
      relationship is formalised two lessons from now as inversion, and it cuts the number
      of intervals you have to learn by ear roughly in half.`,

    nerd: `The major sixth is a 5:3 ratio and the minor sixth 8:5, both simple enough to
      count as consonances, and both were admitted to counterpoint later than the perfect
      intervals for the same reason thirds were. The minor sixth carries a particular
      emotional weight in tonal music because of where it usually appears: as the flat sixth
      degree, leaning down toward the fifth. There is one persistent notation trap here.
      In a diminished seventh chord the interval from the root to the top note spans seven
      letters and only nine half steps, so it is a diminished seventh, not a major sixth,
      even though your fingers cannot tell the difference.`,
  },

  steps: {
    why: {
      text: `Wide intervals are where most people's ear training stalls, because there are
        more half steps to count and counting stops working. Sixths are the place to learn
        the shortcut that makes wide intervals easy.`,
    },

    hear: {
      text: `The tonic held underneath, then a minor sixth above it, then a major sixth.
        Eight half steps, then nine.`,
      example: { kind: 'stack', intervals: ['P1', 'm6', 'M6'] },
      playback: 'drone-then-note',
    },

    see: {
      text: `Both sixths on the staff and the ring. On the page, a sixth is a wide gap
        between the two noteheads, five positions skipped.`,
      example: { kind: 'stack', intervals: ['P1', 'm6', 'M6'] },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'interval-ear',
        prompt: `Play a third, then move its lower note up an octave and listen to what you
          are left with.`,
        noticing: `A minor third turns into a major sixth and a major third turns into a
          minor sixth. The two notes never changed, only which one is on the bottom.`,
        views: ['piano', 'pitchring', 'staff'],
        labelMode: 'interval',
        controls: ['invert', 'play', 'octave-shift', 'compare', 'reveal'],
        example: { kind: 'stack', intervals: ['P1', 'm3', 'M6'] },
      },
    },

    name: {
      term: 'Major and minor sixth',
      text: `Major sixth: six letters, nine half steps. Minor sixth: six letters, eight
        half steps. A major sixth is an upside-down minor third, and a minor sixth is an
        upside-down major third.`,
      symbol: 'M6 / m6',
      alsoCalled: ['the inverted third'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Major sixth or minor sixth?`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['m6', 'M6'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `If you are stuck, flip it in your head: does the upside-down version
          sound like a bright third or a dark one?`,
      },
    },

    apply: {
      text: `A major chord with its lowest note moved up an octave contains a sixth where
        the third used to be. That is a chord inversion, and it is one of the main reasons
        real music does not sit in root position all the time.`,
      task: `Play a triad, then move its bottom note up an octave. Find the sixth that has
        appeared and name its quality.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Wide intervals only. Some of these are neighbours and easy to mix up.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['P5', 'm6', 'M6', 'm7'] },
        views: ['piano', 'staff'],
        labelMode: 'none',
        feedback: `Anchor on the fifth. A minor sixth is one half step above it; a major
          sixth is two.`,
      },
    },

    review: {
      takeaways: [
        `Six letters; nine half steps major, eight minor.`,
        `A sixth is a third turned upside down, with the quality flipped.`,
        `Wide intervals are easier to identify by flipping than by counting.`,
      ],
      next: `One interval left before the octave, and it is the tensest of the lot.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w1-l8-sevenths',
  world: 1,
  index: 8,
  minutes: 5,
  title: 'Nearly There',
  subtitle: 'Sevenths, and the pull of the last half step',
  teaches: ['seventh'],
  requires: ['sixth'],

  depths: {
    quick: `A seventh spans seven letters and stops just short of the octave: eleven half steps is major, ten is minor.`,

    normal: `A seventh is one letter short of the octave. Eleven half steps makes it major
      and it sits a single half step below the octave, which makes it sound like it is
      straining upward. Ten half steps makes it minor, a whole step below the octave, which
      sounds much calmer. The two are only a half step apart and they behave completely
      differently, so this is a pair worth learning to tell apart by ear.`,

    deep: `The major seventh's tension comes from proximity. A note a half step below your
      reference point is heard as leaning into it, which is why the seventh degree of a
      major scale is called the leading tone. The minor seventh is a whole step below and
      does not lean the same way, which is why it can sit inside a chord for bars at a time
      without anyone feeling the need to resolve it; it is the interval that makes a
      dominant seventh restless but a minor seventh chord relaxed. When you meet seventh
      chords in World 3, the choice between these two intervals is what separates a lush
      resting chord from a chord that wants to move.`,

    nerd: `The minor seventh's tuning history is worth knowing. The seventh partial of the
      harmonic series is a flat-sounding seventh, close to 7:4, noticeably lower than the
      minor seventh you get on a keyboard, and it is the sound barbershop quartets and
      brass players lock onto in a dominant chord. Equal temperament has no such interval;
      what we call a minor seventh is really a stack of two fourths. There is also a
      spelling trap that catches people constantly: the diminished seventh spans seven
      letters but only nine half steps, so it sounds exactly like a major sixth and is not
      one. It exists so a diminished seventh chord can be written as a clean stack of
      thirds, which requires a double flat and is worth it.`,
  },

  steps: {
    why: {
      text: `You have covered every interval inside an octave except this one. It is also
        the one that turns a plain triad into the harmony that most modern music actually
        uses, so it is worth more than a passing mention.`,
    },

    hear: {
      text: `The tonic, then a minor seventh, a major seventh, and the octave. Listen to
        how much harder the major seventh pulls toward the note above it.`,
      example: { kind: 'stack', intervals: ['P1', 'm7', 'M7', 'P8'] },
      playback: 'sequence',
    },

    see: {
      text: `All four notes on the ring. The major seventh is a single position away from
        the tonic. It is closer to home going up than going down.`,
      example: { kind: 'stack', intervals: ['P1', 'm7', 'M7', 'P8'] },
      views: ['pitchring', 'piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Put the seventh degree of a major scale next to the tonic above it, then
          lower the seventh by a half step and compare again.`,
        noticing: `The major seventh sits one half step below home and sounds like it is
          being pulled there. Lower it and the pull disappears almost completely.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'degree',
        controls: ['accidental-step', 'play', 'compare', 'tonic-picker', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Major and minor seventh',
      text: `Major seventh: seven letters, eleven half steps, one half step below the
        octave. Minor seventh: seven letters, ten half steps, one whole step below. The
        seventh degree of a major scale is also called the leading tone, because of where
        it wants to go.`,
      symbol: 'M7 / m7',
      alsoCalled: ['leading tone', 'flat seventh'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Major seventh or minor seventh?`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['m7', 'M7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Sing the octave above the lower note, then check whether the seventh is
          a half step or a whole step below it.`,
      },
    },

    apply: {
      text: `Add a seventh to a triad and you get the harmony of jazz, soul, bossa nova and
        most film scoring. Which seventh you add decides whether the chord rests or moves.`,
      task: `Play the chord below, then flatten its top note by a half step and listen. The
        chord changes from something you could end on to something that has to go
        somewhere.`,
      example: { kind: 'chord', chordId: 'maj7' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Near the octave, one half step is the whole difference. Name each one
          exactly.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['M6', 'm7', 'M7', 'P8'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Count down from the octave instead of up from the bottom. It is one
          half step, one whole step, or a step and a half.`,
      },
    },

    review: {
      takeaways: [
        `Seven letters; eleven half steps major, ten minor.`,
        `The major seventh leans hard into the octave; the minor seventh does not.`,
        `Sevenths are what turn triads into modern harmony.`,
      ],
      next: `Every interval so far has been played two ways without comment. Time to name
        the difference.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w1-l9-melodic-harmonic',
  world: 1,
  index: 9,
  minutes: 4,
  title: 'One After Another, or Both at Once',
  subtitle: 'Melodic and harmonic intervals',
  teaches: ['melodic-harmonic'],
  requires: ['interval'],

  depths: {
    quick: `The same interval is melodic when the notes come one after another and harmonic when they sound together.`,

    normal: `Two notes played in sequence make a melodic interval. The same two notes
      played simultaneously make a harmonic interval. It is the same distance either way,
      and it gets the same name, but it does not sound the same, and it is not equally
      easy to identify. Most people find melodic intervals much easier at first, because
      the ear can follow one note moving to another.`,

    deep: `Played together, two notes partly fuse: their overtones interact and you hear a
      single blended sound with a texture rather than two separate pitches. That is what
      makes harmonic intervals harder to name and also what makes harmony possible at all.
      The effect is strongest for close intervals (a harmonic minor second sounds rough
      and beating in a way the melodic version never does) and weakest for wide ones,
      which is part of why sixths and sevenths are usable in close harmony while seconds
      generally are not. When you practise ear training, treat melodic and harmonic as two
      separate skills, because being good at one does not automatically make you good at
      the other.`,

    nerd: `The roughness of close harmonic intervals has a physical explanation: two
      frequencies close together produce beating at the difference frequency, and when that
      beating lands in a certain range the ear reports it as dissonance. The width of that
      range depends on register, which is why a harmonic third sounds fine in the middle of
      a piano and muddy two octaves lower. Arrangers space chords wider in the bass for
      exactly this reason. Notation has a quirk here too: a harmonic second cannot be
      written with both noteheads in the usual place because they would collide, so one is
      offset to the side, and a harmonic unison between two voices is written as a single
      notehead with two stems.`,
  },

  steps: {
    why: {
      text: `Everything so far has been demonstrated both ways without saying so. The
        distinction has a name, and it matters because your ear treats the two cases very
        differently.`,
    },

    hear: {
      text: `The same two notes, first one after the other, then together. Same interval,
        two quite different experiences.`,
      example: { kind: 'interval', intervalId: 'M3' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `On the staff, melodic intervals are written side by side and harmonic ones
        stacked in the same vertical position. On the keyboard, nothing about the distance
        changes.`,
      example: { kind: 'interval', intervalId: 'M3' },
      views: ['staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'melodic-harmonic-toggle',
        prompt: `Pick an interval and switch it between one-after-another and both-at-once.
          Try it with a very narrow interval and a very wide one.`,
        noticing: `Narrow intervals get rough when they are played together and stay
          perfectly pleasant when they are played in sequence. Wide intervals barely change
          at all.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'interval',
        controls: ['play', 'compare', 'tempo', 'octave-shift', 'reset'],
        example: { kind: 'interval', intervalId: 'm2' },
      },
    },

    name: {
      term: 'Melodic and harmonic intervals',
      text: `Melodic: the notes sound one after another. Harmonic: they sound together. The
        name of the interval is identical in both cases. Only the presentation differs.`,
      alsoCalled: ['linear interval', 'vertical interval'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Harmonic only. Name the interval without hearing the notes separately.`,
        reps: 10,
        asks: 'interval-name',
        mode: 'harmonic',
        pool: { kind: 'interval', ids: ['M3', 'P5', 'm6'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Try to pick out the lower note first and sing up to the higher one. That
          converts the problem into one you have already solved.`,
      },
    },

    apply: {
      text: `Melody is a chain of melodic intervals; harmony is a stack of harmonic ones.
        Every chord you meet from here on is several harmonic intervals happening at once,
        and analysing a chord means naming them.`,
      task: `Play the chord below as a block, then play its notes one at a time. Name the
        distance from the bottom note to each of the others.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Harmonic, and this time the options are close together.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'harmonic',
        pool: { kind: 'interval', ids: ['m3', 'M3', 'P4', 'P5'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Thirds blend into a single colour; fourths and fifths stay hollow and
          open. Judge the texture before you try to count anything.`,
      },
    },

    review: {
      takeaways: [
        `Melodic means in sequence, harmonic means together.`,
        `The interval name is the same either way.`,
        `Harmonic intervals are harder to identify, and worth practising separately.`,
      ],
      next: `Now the trick that halves how many intervals you have to learn.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L10 = defineLesson({
  id: 'w1-l10-inversion',
  world: 1,
  index: 10,
  minutes: 6,
  title: 'Flip It and the Numbers Add to Nine',
  subtitle: 'Interval inversion',
  teaches: ['interval-inversion'],
  requires: ['seventh', 'melodic-harmonic'],

  depths: {
    quick: `Move the lower note of an interval up an octave and the numbers add to nine while major and minor swap.`,

    normal: `Take any interval inside an octave and move its bottom note up an octave, so
      the notes trade places. What you get is that interval's inversion. Two rules cover
      the whole thing. The numbers always add up to nine: a third inverts to a sixth, a
      second to a seventh, a fourth to a fifth. And the quality flips: major becomes minor,
      minor becomes major, augmented becomes diminished. Perfect stays perfect.`,

    deep: `The reason the numbers add to nine rather than eight is the inclusive counting
      you met in lesson two. Both intervals count their shared boundary notes, so the two
      spans overlap by one letter at each end and the total comes out one higher than the
      eight letters an octave contains. The quality flip has a simpler explanation: the two
      intervals must add up to twelve half steps, so if one of them is a half step larger
      than standard, the other has to be a half step smaller. This is not a curiosity. It
      is a practical shortcut (learn the intervals up to the tritone properly and you get
      the wide ones free), and it is the mechanism behind chord inversions, where the same
      chord takes on a different character depending on which note is at the bottom.`,

    nerd: `Two edge cases. The unison inverts to the octave, which is consistent with the
      rule since one plus eight is nine, but it feels strange because nothing appears to
      move. And the tritone inverts to itself: an augmented fourth becomes a diminished
      fifth, which is six half steps either way, since it is the only interval that divides
      the octave symmetrically. Compound intervals also need care. The convention is to
      reduce a compound interval to its simple form before inverting, so a major tenth
      inverts as a major third and gives a minor sixth; the theory engine behind this
      course does exactly that, which means asking it to invert a tenth returns a sixth
      rather than something exotic. Inversion also generalises upward to chords, where the
      same idea explains why a first-inversion triad has a sixth above its bass.`,
  },

  steps: {
    why: {
      text: `There are twelve intervals inside an octave and learning all of them by ear
        is a slog. There is a symmetry that means you only really have to learn about half
        of them, and it also explains why chords change character when you rearrange them.`,
    },

    hear: {
      text: `Three notes: a starting note, a third above it, and the octave. Listen to the
        bottom pair, then to the top pair. Same two letters, different distance.`,
      example: { kind: 'stack', intervals: ['P1', 'M3', 'P8'] },
      playback: 'sequence',
    },

    see: {
      text: `On the staff, the flip is easy to see: the lower note jumps up an octave and
        the two notes trade places, but no new note has appeared.`,
      example: { kind: 'stack', intervals: ['P1', 'M3', 'P8'] },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'inversion-mirror',
        prompt: `Build an interval, then invert it and read both numbers. Do it for a
          second, a third, a fourth and a tritone.`,
        noticing: `Every pair of numbers adds to nine, the qualities swap, and the tritone
          turns into itself.`,
        views: ['pitchring', 'staff', 'piano'],
        labelMode: 'interval',
        controls: ['invert', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'ladder' },
      },
    },

    name: {
      term: 'Inversion',
      text: `Moving the lower note of an interval up an octave, or the upper note down one.
        Numbers add to nine; major and minor swap; augmented and diminished swap; perfect
        stays perfect. Sometimes called the rule of nine.`,
      symbol: 'M3 ↔ m6',
      alsoCalled: ['the rule of nine', 'inverted interval'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `What does this interval invert to?`,
        reps: 10,
        asks: 'invert',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['m2', 'M3', 'm3', 'P4', 'P5', 'M6', 'm6', 'M7'] },
        views: ['pitchring'],
        labelMode: 'interval',
        feedback: `Subtract the number from nine, then flip the quality. Perfect intervals
          keep theirs.`,
      },
    },

    apply: {
      text: `Chord inversions work the same way. Move the bottom note of a triad up an
        octave and the interval structure above the bass changes, which is why the chord
        sounds lighter or less settled without changing its name.`,
      task: `Play a triad, then play it with the bottom note moved up an octave. Name the
        intervals above the bass in both versions and see the rule of nine at work.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Invert these, including the awkward ones.`,
        reps: 8,
        asks: 'invert',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['P1', 'A4', 'd5', 'P8'] },
        views: ['staff', 'pitchring'],
        labelMode: 'interval',
        feedback: `A unison inverts to an octave and back again. The tritone inverts to a
          tritone, changing only its spelling.`,
      },
    },

    review: {
      takeaways: [
        `Numbers add to nine, qualities swap, perfect stays perfect.`,
        `Learn the small intervals and the wide ones come free.`,
        `The tritone inverts to itself; the unison inverts to the octave.`,
      ],
      next: `One last case: what happens when an interval is bigger than an octave.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L11 = defineLesson({
  id: 'w1-l11-compound-intervals',
  world: 1,
  index: 11,
  minutes: 5,
  title: 'Bigger Than an Octave',
  subtitle: 'Compound intervals and why chords count to thirteen',
  teaches: ['compound-interval'],
  requires: ['interval-inversion', 'octave'],

  depths: {
    quick: `An interval wider than an octave is compound, and you name it by folding it back inside one and adding seven.`,

    normal: `Intervals do not stop at the octave. A third plus an octave is a tenth, a
      second plus an octave is a ninth, a fourth plus an octave is an eleventh. These are
      compound intervals. To work one out, take the interval inside the octave and add
      seven to its number, not eight, because the octave itself gets counted from both
      sides. The quality never changes: a major third plus an octave is a major tenth.`,

    deep: `Compound intervals sound like their simple versions, only more spacious. That is
      octave equivalence doing its job: the notes belong to the same two pitch classes, so
      the relationship is recognisably the same, but the extra distance stops the two notes
      from interfering and makes wide voicings sound clear rather than muddy. This is why
      arrangers spread chords out. Most of the time you can name a compound interval by
      simplifying it and adding seven back, and the only reason to keep the compound name at
      all is when the actual spacing matters, which, in chord symbols, it very much does.`,

    nerd: `The number nine, eleven and thirteen in chord symbols are compound on purpose.
      A chord written as a ninth implies a seventh underneath it, so the ninth genuinely
      sits above the seventh and calling it a second would misdescribe the voicing; that
      is also why an added-note chord is written "add9" rather than "9", because it has no
      seventh. The naming is not perfectly consistent: an eleventh is usually voiced above
      the seventh but is often described as a fourth when it substitutes for the third, and
      a thirteenth is a sixth in every practical sense once you voice it. Watch the
      arithmetic too. Adding seven rather than eight catches people out constantly, and
      the reason is the same inclusive counting that made the rule of nine work in the
      previous lesson.`,
  },

  steps: {
    why: {
      text: `Chord symbols are full of numbers larger than eight, and none of them are
        explained anywhere in the symbol itself. They are all this lesson, and the rule is
        one line long.`,
    },

    hear: {
      text: `A third, then the same relationship stretched an octave wider. It is
        recognisably the same interval, just roomier.`,
      example: { kind: 'stack', intervals: ['P1', 'M3', 'M10'] },
      playback: 'sequence',
    },

    see: {
      text: `On the ring, the third and the tenth land in exactly the same place, because
        the ring ignores register. On the staff and the keyboard, the difference is
        obvious.`,
      example: { kind: 'stack', intervals: ['P1', 'M3', 'M10'] },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'compound-collapse',
        prompt: `Take a wide interval and fold its upper note down by octaves until it fits
          inside one, watching the number change as you go.`,
        noticing: `Every fold subtracts seven from the number and leaves the quality alone.
          The sound stays recognisably the same interval throughout.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'interval',
        controls: ['octave-fold', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'stack', intervals: ['P1', 'M9', 'M10', 'P12', 'M13'] },
      },
    },

    name: {
      term: 'Compound interval',
      text: `Any interval larger than an octave. Subtract seven from the number to get its
        simple form, or add seven to go the other way. The quality is unchanged, so a minor
        third becomes a minor tenth and a perfect fifth becomes a perfect twelfth.`,
      symbol: 'M9 = M2 + P8',
      alsoCalled: ['ninth', 'tenth', 'eleventh', 'thirteenth'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Reduce each compound interval to its simple form.`,
        reps: 10,
        asks: 'simplify',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['M9', 'M10', 'P11', 'P12', 'M13'] },
        views: ['pitchring'],
        labelMode: 'interval',
        feedback: `Subtract seven, not eight. Nine becomes two, ten becomes three, eleven
          becomes four.`,
      },
    },

    apply: {
      text: `Chord extensions are named as compound intervals because they are voiced above
        the seventh rather than crammed next to the root. A ninth chord is a seventh chord
        with a ninth on top, and the number tells you where it sits.`,
      task: `Play the chord below and find the note a ninth above the root. Then move that
        note down an octave and listen to how much thicker the chord becomes.`,
      example: { kind: 'chord', chordId: 'maj9' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Name each compound interval, then give its simple form.`,
        reps: 8,
        asks: 'simplify',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['m9', 'M9', 'P12', 'M13', 'P15'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `A fifteenth is two octaves. If the simple form comes out as a unison,
          you have folded a whole number of octaves.`,
      },
    },

    review: {
      takeaways: [
        `Compound intervals are wider than an octave.`,
        `Subtract seven to simplify, add seven to expand; quality never changes.`,
        `Ninths, elevenths and thirteenths in chord symbols are this idea.`,
      ],
      next: `You now have the vocabulary for every distance in music. World 2 uses it to
        build scales.`,
    },
  },
});

// ---------------------------------------------------------------------------

export const WORLD_1 = defineWorld({
  id: 'world-1',
  number: 1,
  title: 'Interval Lab',
  tagline: 'Distance is the thing music is actually made of',
  blurb: `Eleven lessons on the gap between two notes: how it is measured, why it needs
    two numbers rather than one, what each one sounds like, and the symmetry that lets you
    learn half of them and get the rest free. Everything in the following five worlds is
    built out of what happens here.`,
  lessons: [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11],
});

export default WORLD_1;
