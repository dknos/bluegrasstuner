/**
 * WORLD 0 — MUSIC BOOT CAMP
 *
 * Nine microlessons, one idea each. Everything here exists to make the next
 * six worlds sayable: you cannot talk about a major third until "third" and
 * "half step" mean something specific.
 *
 * Rules this file follows:
 *   - No example contains notes. Every example is a recipe the theory engine
 *     builds, so the whole world transposes to any key for free.
 *   - The keyboard-geometry lessons pin their tonic to C, because the physical
 *     layout of a piano is fixed and is not a key-relative fact. Everything
 *     else inherits whatever key the learner is working in.
 *   - Where the standard beginner explanation is a lie of convenience, the
 *     lesson says so in the `deep` or `nerd` depth rather than leaving the
 *     learner to be ambushed later.
 */

import { defineLesson, defineWorld } from './schema.js';

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w0-l1-musical-alphabet',
  world: 0,
  index: 1,
  minutes: 3,
  title: 'Seven Names, Then Round Again',
  subtitle: 'The whole naming system, in one sitting',
  teaches: ['musical-alphabet'],
  requires: [],

  depths: {
    quick: `Notes are named with seven letters, A to G, and after G the names start over at A.`,

    normal: `Music uses seven letter names: A, B, C, D, E, F, G. After G you do not
      get an H. You go back to A. So the names run in a loop, not a line. A piano has
      88 keys but only seven letter names, which means the same handful of names comes
      back over and over as you move up the keyboard.`,

    deep: `The letters do not name every pitch. They name the seven notes that a
      keyboard gives you without touching a black key, and those seven were chosen
      because they are the notes of one scale, not because they divide the octave evenly.
      That is why the gaps between neighbouring letters are not all the same size: some
      pairs sit right next to each other and some have a key between them. The alphabet
      is a naming system inherited from a musical decision, so it carries that decision
      around with it forever.`,

    nerd: `The letter names are medieval. Notation started from a two-octave gamut
      labelled A upward, which is why A rather than C begins the alphabet even though C
      begins the major scale everyone learns first. German-speaking notation still writes
      B for our B flat and H for our B natural, so a Bach signature spelling B-A-C-H is
      playable and means B flat, A, C, B natural. Plenty of the world does not use letters
      at all: movable-do solfège names notes by their function in the key, so "do" is a
      job rather than a pitch, and fixed-do systems name pitches with syllables where we
      use letters. Nothing about seven is acoustically necessary: it is a convention that
      happens to fit the scale Western notation was built to write down.`,
  },

  steps: {
    why: {
      text: `Before you can be told anything about music, you need a way to point at one
        sound and have someone else find the same one. That is all note names are: a
        pointing system. It is small, it repeats, and you can learn the whole of it in
        about a minute.`,
    },

    hear: {
      text: `Seven notes, in order, then the eighth one. Listen to where it seems to arrive.`,
      example: { kind: 'letters' },
      playback: 'sequence',
    },

    see: {
      text: `The same seven notes on the keyboard and on the staff. Notice that the names
        march in order and then restart.`,
      example: { kind: 'letters' },
      views: ['piano', 'staff'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'letter-wheel',
        prompt: `Drag around the wheel. Stop wherever you like, then keep going in the
          same direction until you are back where you started.`,
        noticing: `You pass seven names and land on the one you began with. There is no
          eighth name to find.`,
        views: ['pitchring', 'piano'],
        labelMode: 'name',
        controls: ['letter-slider', 'play', 'tonic-picker', 'reset'],
        example: { kind: 'letters' },
      },
    },

    name: {
      term: 'The musical alphabet',
      text: `A, B, C, D, E, F, G, and then A again. When people say "the musical
        alphabet" this loop is what they mean. Every note name in the rest of the course
        is one of these seven letters, sometimes with a symbol attached to it.`,
      alsoCalled: ['note names', 'letter names'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Which letter comes next?`,
        reps: 8,
        asks: 'letter-order',
        pool: { kind: 'letter', ids: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
        views: ['piano'],
        labelMode: 'name',
        feedback: `The only one that catches people is G. After G comes A.`,
      },
    },

    apply: {
      text: `A melody that keeps climbing runs out of new names almost immediately, so
        players learn to read names as a cycle rather than a list. Start on any letter and
        count seven steps upward and you are back on the letter you started from.`,
      task: `Pick any white key on the keyboard. Say its name, then name the next six
        white keys upward without looking at the labels. The seventh should bring you
        back to your starting letter.`,
      example: { kind: 'letters' },
    },

    challenge: {
      drill: {
        kind: 'order',
        prompt: `Put these letters in ascending order, starting from the one shown. The
          loop wraps: the letter after G is A.`,
        reps: 5,
        asks: 'letter-order',
        pool: { kind: 'letter', ids: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
        labelMode: 'name',
        feedback: `Starting anywhere except A is the whole exercise. The order never
          changes, only the entry point.`,
      },
    },

    review: {
      takeaways: [
        `Seven letters, A to G, then straight back to A.`,
        `The names repeat up and down the whole instrument.`,
        `These seven name the white keys. Not every pitch has its own letter.`,
      ],
      next: `Twelve keys per octave, seven letters. Next lesson: where the other five went.`,
    },
  },
});

// -------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w0-l2-why-seven',
  world: 0,
  index: 2,
  minutes: 5,
  title: 'Why Seven and Not Twelve',
  subtitle: 'The alphabet names a scale, not the octave',
  teaches: ['why-seven-letters'],
  requires: ['musical-alphabet'],

  depths: {
    quick: `There are twelve pitches in an octave but only seven letters, because the letters name one seven-note scale.`,

    deep: `If the letters were meant to divide the octave evenly, there would be twelve
      of them and every gap would be the same size. They are not, and the gaps are not.
      The seven letters name the notes of one particular scale (the one you get by
      playing only white keys from C to C), and everything else is described as a
      modification of one of those seven. That choice makes the common case short to
      write and the uncommon case longer, which is exactly the trade a notation system
      should make. It also means the naming system quietly assumes a scale before you
      have even learned what a scale is.`,

    normal: `An octave contains twelve different pitches, evenly spaced. The letters only
      cover seven of them. The other five are named by borrowing a letter and raising or
      lowering it. So the naming system is not a ruler with twelve equal marks; it is
      seven landmarks with the rest described by how far they sit from a landmark.`,

    nerd: `Twelve-tone equal temperament is a tuning compromise, not a law. The octave
      gets split into twelve equal steps so that every key sounds equally usable and none
      sounds perfect. Seven-out-of-twelve is also not arbitrary: take any note, keep
      stacking perfect fifths, and after seven notes you have exactly the white keys, at
      which point the pattern is as evenly spread through the octave as a seven-note set
      can be. Other traditions slice the octave differently: Arabic maqam practice uses
      intervals that sit between our keys, and gamelan tunings are not built from twelve
      at all. So "twelve pitches" is a description of one system, widely used, not a fact
      about sound.`,
  },

  steps: {
    why: {
      text: `You already know seven names. The instrument in front of you has twelve
        different notes before anything repeats. Those numbers do not match, and until
        that stops feeling like a mistake, nothing about sharps, flats or scales will
        make sense.`,
    },

    hear: {
      text: `First the seven lettered notes, then all twelve. The seven sound like
        something. The twelve sound like a staircase with no destination.`,
      example: { kind: 'ladder' },
      playback: 'sequence',
    },

    see: {
      text: `All twelve pitches in one octave, numbered by how many half steps they sit
        above the starting note. Seven of them have plain letter names. Five do not.`,
      example: { kind: 'ladder' },
      views: ['pitchring', 'piano'],
      labelMode: 'semitones',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Light up the seven lettered notes on the ring, then look at the gaps
          between them.`,
        noticing: `The seven are not evenly spaced. Two pairs sit right next to each
          other with nothing between them; the other five pairs have a gap.`,
        views: ['pitchring', 'piano'],
        labelMode: 'name',
        controls: ['tonic-picker', 'label-mode', 'play', 'compare'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Diatonic',
      text: `A seven-note set of this shape is called diatonic. The white keys are one
        diatonic set; every major and minor key is another. When you hear someone say a
        note is "outside the key", they mean it is one of the five that this particular
        seven left out.`,
      alsoCalled: ['the seven-note set', 'in the key'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Does this pitch have a letter name of its own, or does it have to borrow
          one?`,
        reps: 8,
        asks: 'note-name',
        pool: { kind: 'letter', ids: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Seven of the twelve are lettered. The rest get named later, using a
          letter plus a symbol.`,
      },
    },

    apply: {
      text: `The uneven spacing is not a flaw to be worked around: it is what gives a
        scale a shape, and it is why moving a melody up by "two notes" is a different
        distance in different places. Every scale in World 2 is described by exactly this
        pattern of gaps.`,
      task: `Play the seven lettered notes upward and find the two places where the next
        note is as close as it can possibly be. Everywhere else, something is skipped.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Some of these claims about the gaps between the seven lettered notes are
          wrong. Catch them.`,
        reps: 6,
        asks: 'step-size',
        pool: { kind: 'step-size', ids: ['H', 'W'] },
        feedback: `Most gaps are the larger size. Exactly two are the small one, and they
          are not next to each other.`,
      },
    },

    review: {
      takeaways: [
        `Twelve pitches per octave; seven of them have letters.`,
        `The seven are unevenly spaced, and that unevenness is the point.`,
        `A seven-note set shaped like this is called diatonic.`,
      ],
      next: `The unevenness is printed on the keyboard in black and white. That is the next lesson.`,
    },
  },
});

// -------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w0-l3-keyboard-map',
  world: 0,
  index: 3,
  minutes: 4,
  title: 'The Black Keys Are a Map',
  subtitle: 'Groups of two and three, and why they exist',
  teaches: ['piano-layout'],
  requires: ['musical-alphabet'],

  depths: {
    quick: `Black keys come in groups of two and three so you can find any note without counting from the end.`,

    normal: `Look along a keyboard and the black keys alternate: a group of two, a group
      of three, two, three, forever. That pattern is a landmark system. C is always the
      white key immediately to the left of a group of two. F is always the white key
      immediately to the left of a group of three. Once you can see the groups, you never
      have to count keys from the bottom of the instrument again.`,

    deep: `The grouping is a direct picture of the uneven spacing you just met. Where two
      lettered notes sit right next to each other there is no room for a black key, and
      that is where a group ends. There are exactly two such places in the seven, so the
      black keys break into exactly two runs: one of two keys, one of three. The
      keyboard is not decorated with a pattern; the pattern is the leftover space, and it
      is unavoidable given which seven notes got letters.`,

    nerd: `The two-and-three layout dates from keyboards that were built for one diatonic
      set and had chromatic notes added as they became useful, so the "extra" keys ended
      up shorter, further back, and grouped by whatever space was left. Alternative
      layouts exist and are arguably better: the Janko keyboard and modern isomorphic
      button layouts space every half step identically, so a chord shape is the same shape
      in all twelve keys. They never displaced the piano, partly because the uneven layout
      is genuinely useful for orientation by touch, and partly because a couple of
      centuries of repertoire is written for hands that know where the groups are.`,
  },

  steps: {
    why: {
      text: `A keyboard is 88 identical-looking keys. If you had to count from one end to
        find a note, playing anything would be impossible. You do not have to, because the
        black keys are arranged as signposts.`,
    },

    hear: {
      text: `The white keys, in order, from C. This is the row the black keys are
        pointing at.`,
      example: { kind: 'letters', tonic: 'C4' },
      playback: 'sequence',
    },

    see: {
      text: `Twelve keys, one octave. Watch where the black keys fall, and where they
        cannot fall, because two white keys are already touching.`,
      example: { kind: 'ladder', tonic: 'C4' },
      views: ['piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'black-key-grouper',
        prompt: `Point at each group of black keys, then name the white key immediately
          to the left of each group.`,
        noticing: `The key left of a group of two is always C. The key left of a group of
          three is always F. It is true everywhere on the instrument.`,
        views: ['piano'],
        labelMode: 'none',
        controls: ['label-mode', 'octave-shift', 'play', 'reveal'],
        example: { kind: 'letters', tonic: 'C4' },
      },
    },

    name: {
      term: 'The two-three pattern',
      text: `The repeating unit is one group of two black keys plus one group of three,
        which together span twelve keys, or one octave. Musicians use C-left-of-two and
        F-left-of-three as their anchor points, then count outward from there.`,
      alsoCalled: ['the keyboard landmarks'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `No labels. Name the highlighted white key using the black-key groups.`,
        reps: 10,
        asks: 'note-name',
        pool: { kind: 'letter', ids: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Find the nearest group first, decide whether it is a two or a three,
          then count.`,
      },
    },

    apply: {
      text: `Piano players find their position by feel, not by looking, and the groups
        are what make that possible: three black keys under your fingers tell you exactly
        where you are in the octave even in the dark.`,
      task: `Without labels on, put a finger on every C on the keyboard, then every F.
        Use only the groups.`,
      example: { kind: 'octaves', tonic: 'C4', count: 3 },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Place the named white key on an unlabelled keyboard, anywhere it
          appears.`,
        reps: 8,
        asks: 'note-name',
        pool: { kind: 'letter', ids: ['B', 'E', 'A', 'D', 'G'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `B and E are the awkward ones because they sit at the right-hand end of
          a group, not the left.`,
      },
    },

    review: {
      takeaways: [
        `Black keys run two, three, two, three all the way up.`,
        `C sits left of a two; F sits left of a three.`,
        `The groups exist because two pairs of white keys have no room between them.`,
      ],
      next: `Those "no room between them" pairs have a name. That is the next lesson.`,
    },
  },
});

// -------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w0-l4-steps',
  world: 0,
  index: 4,
  minutes: 5,
  title: 'The Two Sizes of Step',
  subtitle: 'Half steps, whole steps, and counting keys',
  teaches: ['half-step', 'whole-step'],
  requires: ['piano-layout'],

  depths: {
    quick: `A half step is the move to the very next key; a whole step skips exactly one key.`,

    normal: `Move from any key to the key immediately next to it, black or white, and you
      have moved a half step. That is the smallest distance in this system. Move two of
      those at once, skipping exactly one key in between, and you have moved a whole step.
      Every distance in music is built out of these, so counting keys is the most useful
      habit you can pick up in the first hour.`,

    deep: `Notice what the definition does not mention: colour. A half step is the next
      key along, regardless of whether it is black or white, and that is why B to C and E
      to F are half steps despite both notes being white. Beginners who learn "a half step
      means white to black" get those two pairs wrong forever. The whole step is defined
      on top of the half step rather than independently, which matters later: a whole step
      is always two half steps, but which key you skip depends on where you started.`,

    nerd: `The half step is the smallest interval in twelve-tone equal temperament, where
      it is exactly one twelfth of an octave, a frequency ratio of the twelfth root of
      two, about 1.0595. It is not the smallest interval in music. Violinists and singers
      routinely place notes between the keys, blues playing lives in that space, and
      several traditions treat quarter tones as ordinary. Even within our system, two
      notes that share a key are not always tuned identically: in older meantone and
      well-tempered keyboards, the note we would call G sharp and the note we would call
      A flat were genuinely different pitches, and organs were sometimes built with
      separate keys for them.`,
  },

  steps: {
    why: {
      text: `Every scale, chord and interval you will meet is described as a number of
        steps. If your counting is one key out, everything downstream is wrong, and the
        mistake is invisible until something sounds bad.`,
    },

    hear: {
      text: `A half step, then a whole step, from the same starting note. The half step
        sounds tight, almost like one note refusing to move. The whole step sounds like an
        actual step.`,
      example: { kind: 'stack', intervals: ['P1', 'm2', 'M2'] },
      playback: 'sequence',
    },

    see: {
      text: `The same three notes on the keyboard, labelled by how many half steps they
        sit above the first.`,
      example: { kind: 'stack', intervals: ['P1', 'm2', 'M2'] },
      views: ['piano', 'pitchring'],
      labelMode: 'semitones',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Walk upward using only half steps and count how many it takes to get
          back to your starting letter. Then walk the white keys only and count the size
          of each gap.`,
        noticing: `Twelve half steps returns you to the start. Walking white keys gives
          mostly whole steps, but two gaps come out as half steps, and both of those are
          white key to white key.`,
        views: ['piano', 'pitchring'],
        labelMode: 'semitones',
        controls: ['semitone-slider', 'play', 'direction', 'label-mode', 'reset'],
        example: { kind: 'ladder' },
      },
    },

    name: {
      term: 'Half step and whole step',
      text: `Half step: adjacent keys, no key skipped. Whole step: two half steps, exactly
        one key skipped. British and older texts call them semitone and tone, and mean
        precisely the same thing.`,
      symbol: 'H / W',
      alsoCalled: ['semitone', 'tone', 'minor 2nd', 'major 2nd'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Half step or whole step?`,
        reps: 10,
        asks: 'step-size',
        mode: 'melodic-up',
        pool: { kind: 'step-size', ids: ['H', 'W'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Half steps sound clenched. Whole steps sound like the first two notes
          of a scale.`,
      },
    },

    apply: {
      text: `The major scale is nothing but an order for these two sizes, which is why
        one pattern can be started on any note and still be the same scale. You will build
        it that way in World 2.`,
      task: `Start on any key at all and play the pattern whole, whole, half, whole,
        whole, whole, half. Then start somewhere else and play the same pattern. Both
        should sound like the same tune.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Count the keys between these two notes. Include black keys.`,
        reps: 8,
        asks: 'step-size',
        mode: 'visual',
        pool: { kind: 'interval', ids: ['m2', 'M2', 'A1'] },
        views: ['piano'],
        labelMode: 'semitones',
        feedback: `Two of these are the same distance and are still written differently.
          That is not a mistake, and the next two lessons explain it.`,
      },
    },

    review: {
      takeaways: [
        `Half step: the very next key, black or white.`,
        `Whole step: two half steps, one key skipped.`,
        `B to C and E to F are half steps even though both keys are white.`,
      ],
      next: `To name the five keys with no letter of their own, you need one more symbol.`,
    },
  },
});

// -------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w0-l5-sharps-flats',
  world: 0,
  index: 5,
  minutes: 5,
  title: 'Raising and Lowering a Letter',
  subtitle: 'Sharps, flats and naturals',
  teaches: ['accidentals'],
  requires: ['half-step'],

  depths: {
    quick: `A sharp raises a note by a half step; a flat lowers it by a half step.`,

    normal: `You have seven letters and twelve pitches, so five pitches need names. Rather
      than invent new letters, the system modifies the ones it has. A sharp means "this
      letter, one half step higher". A flat means "this letter, one half step lower". A
      natural cancels either one and gives you the plain letter back. The symbol always
      comes after the letter when you say or type it, and before the note when you write
      it on a staff.`,

    deep: `The important word in the definition is letter, not key. A sharp does not mean
      "the black key to the right". It means "the note a half step above this letter",
      and where that lands depends entirely on where the letter started. Raise E by a half
      step and you land on the white key F, so E sharp is a real note and it is played
      where F is. Lower C and you land on B. Beginners taught "sharp equals black key" are
      being handed a rule that fails on four of the twelve pitches, and it fails silently.`,

    nerd: `The alteration is a number, not a symbol, which is why the system extends
      cleanly: double sharp raises by two half steps, double flat lowers by two, and the
      engine behind this course stores an alteration from minus three to plus three. You
      will meet double sharps in harmonic minor keys and double flats in diminished
      seventh chords, and they are not affectations: writing G double sharp instead of A
      keeps the letter sequence intact so the chord still looks like stacked thirds. On a
      staff, an accidental applies for the rest of the bar to that exact line or space,
      not to the same letter in other octaves; that rule is a printing convention that
      composers have broken often enough that careful editors add cautionary accidentals
      rather than trust it.`,
  },

  steps: {
    why: {
      text: `Five of the twelve pitches have no letter of their own. Without a way to
        name them, five twelfths of all music is unspeakable, and you cannot write down
        the black keys you have been playing since the last lesson.`,
    },

    hear: {
      text: `A note, then the same note raised by a half step. Same letter, different
        pitch.`,
      example: { kind: 'interval', intervalId: 'A1' },
      playback: 'pair',
    },

    see: {
      text: `Both notes on the staff and on the keyboard. The letter stays put on the
        staff; the symbol in front of it is what changed.`,
      example: { kind: 'interval', intervalId: 'A1' },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'accidental-lab',
        prompt: `Take any letter and raise it a half step, then lower it a half step.
          Try it on every letter, including B and E.`,
        noticing: `Most letters land on a black key when raised. E and B land on a white
          key, because their neighbour is already only a half step away.`,
        views: ['piano', 'staff'],
        labelMode: 'name',
        controls: ['accidental-step', 'letter-slider', 'play', 'spelling-toggle', 'reset'],
        example: { kind: 'ladder' },
      },
    },

    name: {
      term: 'Accidentals',
      text: `Sharp raises a letter by a half step. Flat lowers it by a half step. Natural
        cancels both. Collectively these symbols are called accidentals, which is an
        unhelpful old word for something completely deliberate.`,
      symbol: '♯ ♭ ♮',
      alsoCalled: ['sharp', 'flat', 'natural'],
    },

    practice: {
      drill: {
        kind: 'spell',
        prompt: `Which key is this note? Read the letter first, then apply the symbol.`,
        reps: 10,
        asks: 'spelling',
        pool: { kind: 'spelling', ids: ['C#', 'Eb', 'F#', 'Bb', 'G#', 'Db', 'A#', 'Ab'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Find the letter, then move one key in the direction the symbol says.`,
      },
    },

    apply: {
      text: `Written music puts sharps and flats at the start of a line to say "every one
        of these letters is altered until further notice". That is a key signature, and it
        is just this lesson applied in bulk.`,
      task: `Build a major scale starting on a black key. Every note you play still gets
        one of the seven letters, so some of them will need a symbol.`,
      example: { kind: 'scale', scaleId: 'major', tonic: 'Eb4', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Each of these names a real note. Say which key on the keyboard it is.
          And watch out, not all of them are black.`,
        reps: 6,
        asks: 'spelling',
        pool: { kind: 'spelling', ids: ['E#', 'Cb', 'B#', 'Fb'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `E sharp is played where F is, and F flat is played where E is. The
          symbol modifies the letter, not the colour of the key.`,
      },
    },

    review: {
      takeaways: [
        `Sharp up a half step, flat down a half step, natural back to plain.`,
        `The symbol modifies a letter, not a key colour.`,
        `E sharp, F flat, B sharp and C flat are all real, and all land on white keys.`,
      ],
      next: `If E sharp and F are the same key, are they the same note? Not quite.`,
    },
  },
});

// -------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w0-l6-enharmonics',
  world: 0,
  index: 6,
  minutes: 6,
  title: 'Same Key, Different Note',
  subtitle: 'Why spelling survives even when sound does not care',
  teaches: ['enharmonic-spelling'],
  requires: ['accidentals'],

  depths: {
    quick: `Two names can share a key and still be different notes, because the name says where the note is going.`,

    normal: `Raise C by a half step and you get C sharp. Lower D by a half step and you
      get D flat. Both are the same key and the same sound. They are not the same note. A
      note name carries a letter, and the letter tells you what the note is doing: which
      scale it belongs to, which chord tone it is, whether it is leaning up or down. Choose
      the wrong spelling and the sound is fine but the written music becomes much harder
      to read.`,

    deep: `The reason spelling matters is that music is built out of letter distances, not
      key distances. A chord is a stack of thirds, which on paper means skipping a letter
      each time: C, E, G. If you spell the middle note of a C sharp minor chord as F
      instead of E, the chord no longer looks like stacked thirds and the eye stops
      recognising it. Same sound, unreadable page. Scales work the same way: a major scale
      uses each of the seven letters exactly once, so building one on F sharp forces the
      seventh note to be some kind of E, and it turns out to be E sharp. Spelling is not
      pedantry, it is what keeps the notation aligned with the structure.`,

    nerd: `Enharmonic equivalence is a property of equal temperament, not of music. In
      meantone tuning, D sharp and E flat are different frequencies, and instruments
      without fixed pitch still lean that way: a string player will often place a sharp
      slightly higher than the flat it "equals", because the sharp is pulling upward toward
      a resolution. Equal temperament collapses those distinctions into one key, which is
      the compromise that lets you play in all twelve keys on one instrument. The engine
      behind this course models a note as letter plus alteration plus octave, so it can
      tell you that C sharp and D flat sound the same while being different notes; if it
      stored pitches as numbers instead, that distinction would be gone and every scale it
      printed would eventually be spelled wrong.`,
  },

  steps: {
    why: {
      text: `You are about to see two different names pointing at the same key, and the
        obvious conclusion is that one of them is redundant. It is not. Getting this wrong
        makes chord and scale spelling look arbitrary for the rest of your musical life.`,
    },

    hear: {
      text: `Every sane spelling of one single pitch, played one after another. They are
        the same sound, on purpose. The ear cannot separate them, which is exactly why
        the ear is not the thing that decides the spelling.`,
      example: { kind: 'enharmonics', intervalId: 'A1' },
      playback: 'sequence',
    },

    see: {
      text: `One key on the keyboard, more than one position on the staff. This is the
        whole idea in a single picture.`,
      example: { kind: 'enharmonics', intervalId: 'A1' },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'enharmonic-flip',
        prompt: `Play a black key, then flip its spelling back and forth. Watch the
          keyboard, the staff and the sound.`,
        noticing: `The key stays lit and the sound never changes. The staff position moves
          every time, because a different letter means a different line or space.`,
        views: ['piano', 'staff'],
        labelMode: 'name',
        controls: ['spelling-toggle', 'play', 'tonic-picker', 'compare'],
        example: { kind: 'enharmonics', intervalId: 'A1' },
      },
    },

    name: {
      term: 'Enharmonic',
      text: `Two notes are enharmonic when they sound the same but are spelled
        differently. C sharp and D flat are enharmonic. So are E sharp and F, and B and C
        flat. "Enharmonic equivalent" means the other name for the key you are on.`,
      alsoCalled: ['enharmonic equivalent', 'respelling'],
    },

    practice: {
      drill: {
        kind: 'match',
        prompt: `Pair each note with the other name for the same key.`,
        reps: 8,
        asks: 'spelling',
        pool: { kind: 'spelling', ids: ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'] },
        views: ['piano'],
        labelMode: 'name',
        feedback: `A sharp on one letter is a flat on the letter above it. Every black key
          has exactly one of each.`,
      },
    },

    apply: {
      text: `Build a major scale on F sharp and the seventh note has to be a kind of E,
        because the scale uses every letter once. It comes out as E sharp, played where F
        is. Nobody chose that to be annoying; it falls out of the letters.`,
      task: `Build the scale below and check the letters. Seven notes, seven different
        letters, no letter used twice, even though one of them ends up looking strange.`,
      example: { kind: 'scale', scaleId: 'major', tonic: 'F#4', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Each statement claims two notes are or are not the same. Judge both the
          sound and the spelling.`,
        reps: 6,
        asks: 'same-different',
        pool: { kind: 'spelling', ids: ['B#', 'Cb', 'Fb', 'E#'] },
        views: ['piano', 'staff'],
        labelMode: 'name',
        feedback: `Same key does not mean same note. The right answer is usually "same
          sound, different note".`,
      },
    },

    review: {
      takeaways: [
        `Enharmonic notes share a key and a sound but not a letter.`,
        `The letter is chosen so scales and chords read correctly on the page.`,
        `Same sound, different note is a normal state of affairs, not a contradiction.`,
      ],
      next: `Next: the one case where two different pitches genuinely do share a name.`,
    },
  },
});

// -------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w0-l7-octaves',
  world: 0,
  index: 7,
  minutes: 4,
  title: 'The Same Note, Higher',
  subtitle: 'Octaves and pitch class',
  teaches: ['octave', 'pitch-class'],
  requires: ['musical-alphabet'],

  depths: {
    quick: `Twelve half steps up brings you back to the same letter, and the two sound so alike we call them the same note.`,

    normal: `Play a note, then count twelve half steps upward and play again. The second
      note is higher, obviously, but it also sounds like a copy of the first rather than a
      different note. That distance is an octave, and it is the reason seven letter names
      can cover an entire instrument. Every C on a piano is a C. When you need to be
      specific about which one, you add a number: C4 is the C nearest the middle.`,

    deep: `Octave notes sound alike because the higher one vibrates exactly twice as fast.
      Doubling is the simplest possible relationship between two frequencies, and the ear
      treats it as sameness rather than difference, a phenomenon so reliable that every
      musical culture that names pitches at all treats the octave as a repeat. That is why
      a naming system with seven letters is not absurd: it does not need to name every
      pitch, only every pitch inside one octave, and then reuse the names. When you stop
      caring which octave a note is in and only care which of the twelve it is, you are
      thinking in pitch classes, which is exactly what the pitch ring view shows.`,

    nerd: `Octave equivalence is strong but not total. Men and women singing "the same"
      melody an octave apart are singing different pitches and everyone hears it as unison,
      yet a bass line moved up two octaves stops functioning as a bass line, and a chord
      voiced with its third at the bottom of the piano sounds muddy in a way the same
      chord higher up does not. So octave equivalence is a fact about naming and a
      simplification about function. The 2:1 ratio is also idealised: real strings are
      slightly stiff, so their overtones sit a touch sharp, and piano tuners deliberately
      stretch the octaves at the extremes of the instrument to match. A perfectly
      mathematical piano sounds out of tune.`,
  },

  steps: {
    why: {
      text: `Seven letters cannot possibly cover 88 keys unless the names repeat. They do
        repeat, and the reason is not laziness. It is that notes an octave apart genuinely
        sound like the same thing.`,
    },

    hear: {
      text: `The same note in three registers. Listen for how little changes apart from
        height.`,
      example: { kind: 'octaves', count: 3 },
      playback: 'sequence',
    },

    see: {
      text: `Three keys, far apart on the keyboard, but one single position on the pitch
        ring, because the ring shows which of the twelve a note is, not how high it is. On
        the fretboard the same note turns up in several places at once.`,
      example: { kind: 'octaves', count: 3 },
      views: ['piano', 'pitchring', 'fretboard'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'octave-stack',
        prompt: `Play a note, then add the note twelve half steps above it, then twelve
          above that. Now try eleven half steps instead of twelve.`,
        noticing: `Twelve sounds like the same note. Eleven sounds like a completely
          different one. There is nothing gradual about it.`,
        views: ['piano', 'pitchring', 'staff'],
        labelMode: 'name',
        controls: ['octave-shift', 'play', 'octave-fold', 'compare'],
        example: { kind: 'octaves', count: 3 },
      },
    },

    name: {
      term: 'Octave',
      text: `The distance from a note to the next note of the same letter, twelve half
        steps away. It is called an octave because when you count it in letter names it is
        the eighth. All the notes sharing a letter and accidental, in every register, are
        one pitch class.`,
      symbol: 'P8',
      alsoCalled: ['pitch class', 'the eighth'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Two notes. Same pitch class, or genuinely different notes?`,
        reps: 8,
        asks: 'same-different',
        pool: { kind: 'letter', ids: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
        views: ['piano', 'pitchring'],
        labelMode: 'name',
        feedback: `Ignore height. Ask only whether the letter and any accidental match.`,
      },
    },

    apply: {
      text: `Octave numbers are how you say which one you mean: C4 is middle C, C3 is an
        octave below it, C5 an octave above. Every note in this course carries an octave
        number underneath, which is how the keyboard and the staff stay in agreement.`,
      task: `Find every note of the same pitch class across the whole keyboard. On a full
        piano there are seven or eight of them.`,
      example: { kind: 'octaves', count: 4, octave: 2 },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Same note in a different octave, or a different note entirely?`,
        reps: 8,
        asks: 'same-different',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['P8', 'P5', 'P1', 'M7'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `The near miss is the one a half step short of the octave. It sounds
          tense; a real octave sounds like nothing happened.`,
      },
    },

    review: {
      takeaways: [
        `An octave is twelve half steps, and the note repeats its name.`,
        `Octave notes sound alike because the frequency doubles.`,
        `Pitch class means the note regardless of register.`,
      ],
      next: `Now that pitch has a height, it can be drawn. Enter the staff.`,
    },
  },
});

// -------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w0-l8-staff-and-clefs',
  world: 0,
  index: 8,
  minutes: 6,
  title: 'Five Lines and a Starting Point',
  subtitle: 'The staff, and why it is useless without a clef',
  teaches: ['staff', 'clef'],
  requires: ['musical-alphabet', 'octave'],

  depths: {
    quick: `The staff draws pitch as height, and the clef tells you which pitch one particular line is.`,

    normal: `Written music puts pitch on a vertical axis: higher on the page means higher
      in sound. The staff is five lines and the four spaces between them, and a note sits
      either on a line or in a space. Moving up one line-or-space moves up one letter.
      That gives you relative pitch immediately, but not absolute pitch, because nothing
      so far says which letter the bottom line is. That is the clef's entire job.`,

    deep: `The staff is a diatonic grid, not a chromatic one. Each consecutive line or
      space is the next letter, so the five lines and four spaces show nine letters and
      the accidentals ride on top as symbols rather than as vertical position. That is why
      C sharp and C flat both sit on the C line: they are the same letter, so they are the
      same place. It also means the staff spacing is uneven in sound while being even on
      the page, which sounds like a flaw and is actually the reason a scale looks like a
      straight run of steps rather than a lumpy one. A clef fixes one reference: the
      treble clef curls around the line that is G above middle C, and the bass clef's two
      dots sit either side of the line that is F below middle C. Everything else is
      counted from there.`,

    nerd: `Clefs are movable in principle. The C clef marks middle C wherever it is
      placed, and orchestral parts still use it: viola reads alto clef, and cello, bassoon
      and trombone read tenor clef in their upper range. Historically there were more,
      including soprano and baritone clefs, and the point of all of them was to keep a
      part inside the five lines so the copyist could avoid ledger lines. Some instruments
      are also written at a different octave from where they sound (guitar and tenor
      voice read treble clef but sound an octave lower), so "which line is which pitch" has
      a second answer for transposing instruments, and that is why an orchestral score can
      look like it disagrees with itself.`,
  },

  steps: {
    why: {
      text: `Music notation had to solve one problem before anything else: how do you draw
        a sound on paper so someone else plays the same one back. The answer was to make
        height on the page mean height in pitch, which only works once everyone agrees
        where the ruler starts.`,
    },

    hear: {
      text: `A scale climbing one letter at a time. This is the shape the staff is
        designed to draw: a stepwise line becomes a straight run of lines and spaces.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `The same climb on the staff. Every note moves up exactly one line-or-space,
        with no gaps and no repeats.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'staff-plotter',
        prompt: `Drop a note onto a line, then onto the space above it, then onto the
          next line. Watch which key lights up on the piano each time.`,
        noticing: `One line-or-space is always one letter, never one half step. The
          distance in sound changes depending on where you are; the distance on the page
          does not.`,
        views: ['staff', 'piano'],
        labelMode: 'name',
        controls: ['clef-switch', 'octave-shift', 'play', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Staff and clef',
      text: `The staff is the five lines. A clef is the symbol at the start that pins one
        line to one specific pitch, so every other line and space can be read off it. Notes
        too high or low for the five lines get short ledger lines of their own.`,
      symbol: '𝄞 𝄢',
      alsoCalled: ['stave', 'G clef', 'F clef', 'ledger lines'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `Place the named note on the staff in the clef shown.`,
        reps: 10,
        asks: 'clef-reading',
        pool: { kind: 'clef', ids: ['treble', 'bass'] },
        views: ['staff'],
        labelMode: 'name',
        feedback: `Find the line the clef names first, then count letters up or down from
          there. Counting from the bottom line is slower and goes wrong more often.`,
      },
    },

    apply: {
      text: `Sight-reading is this skill running fast: you are not decoding every note
        from scratch, you are recognising a shape on the page and knowing what shape your
        hand has to make. That only works if the reference point is automatic.`,
      task: `Take the scale below, read it off the staff, and play it without looking at
        the note names.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `The same position on the staff, in two different clefs. Which note is it
          in each?`,
        reps: 8,
        asks: 'clef-reading',
        mode: 'visual',
        pool: { kind: 'clef', ids: ['treble', 'bass'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Without the clef, the position means nothing. That is the point of the
          exercise.`,
      },
    },

    review: {
      takeaways: [
        `Height on the staff means height in pitch.`,
        `One line-or-space is one letter, not one half step.`,
        `The clef is what turns a position into an actual note.`,
      ],
      next: `Two clefs cover the keyboard between them, and they meet at middle C.`,
    },
  },
});

// -------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w0-l9-treble-and-bass',
  world: 0,
  index: 9,
  minutes: 6,
  title: 'Two Clefs, One Keyboard',
  subtitle: 'Reading treble and bass without translating',
  teaches: ['reading-treble-bass'],
  requires: ['clef', 'pitch-class'],

  depths: {
    quick: `Treble and bass clef are two windows onto the same keyboard, joined in the middle by middle C.`,

    normal: `A keyboard covers far more range than five lines can show, so keyboard music
      uses two staves at once: treble clef on top for the right hand, bass clef underneath
      for the left. Together they are called the grand staff. Middle C sits in the gap
      between them, on its own short ledger line, hanging below the treble staff or
      perched above the bass staff, depending on which hand is playing it.`,

    deep: `The two clefs are not arbitrary. Put them side by side and the pattern is
      continuous: the bass staff's top line is A, then B sits above it, then middle C on a
      ledger line, then D, then the treble staff's bottom line is E. Nothing is missing and
      nothing overlaps. If you imagine one extra line where middle C lives, the grand staff
      is one eleven-line staff with the middle line rubbed out to make it readable. That is
      how it was actually conceived, and seeing it that way stops the two clefs from
      feeling like two unrelated alphabets you have to memorise separately.`,

    nerd: `Reading fluently is not two lookup tables, it is interval reading: you identify
      one anchor note and then read the shape (a third up, a step down) rather than
      naming every note. That skill transfers between clefs instantly, which is why
      learning bass clef is much faster than learning treble clef was. The mnemonics people
      teach for line names are a scaffold with a cost, because they encourage a slow
      spell-it-out habit that has to be unlearned later. It is also worth knowing that the
      grand staff can be extended: piano music adds an "8va" instruction rather than
      stacking endless ledger lines, and organ music adds a third staff for the pedals.`,
  },

  steps: {
    why: {
      text: `Everything you can play with your left hand is written in a clef you have not
        read yet. Most people learn treble clef, avoid bass clef, then spend years counting
        lines every time they meet it. It takes one lesson to avoid that.`,
    },

    hear: {
      text: `The same pitch class in two registers: one that will be written in bass
        clef, one in treble. Same note name, different window.`,
      example: { kind: 'octaves', count: 2, octave: 3 },
      playback: 'sequence',
    },

    see: {
      text: `Both notes on the grand staff. Look at where each one sits relative to middle
        C in the gap.`,
      example: { kind: 'octaves', count: 2, octave: 3 },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'clef-slider',
        prompt: `Hold one note and slide it between the clefs. Then walk upward from the
          top line of the bass staff into the bottom line of the treble staff, one letter
          at a time.`,
        noticing: `The walk is continuous. Middle C is the single note sitting in the gap,
          and it can be written from either side.`,
        views: ['staff', 'piano'],
        labelMode: 'name',
        controls: ['clef-switch', 'octave-shift', 'play', 'compare', 'reveal'],
        example: { kind: 'octaves', count: 3, octave: 3 },
      },
    },

    name: {
      term: 'The grand staff',
      text: `Treble clef above, bass clef below, middle C between them on a ledger line.
        Treble clef is also called G clef because it wraps around the G line; bass clef is
        the F clef, with its two dots either side of the F line.`,
      symbol: '𝄞 / 𝄢',
      alsoCalled: ['great stave', 'piano staff', 'middle C'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Name this note. The clef changes between questions, so check it every
          time.`,
        reps: 12,
        asks: 'clef-reading',
        pool: { kind: 'clef', ids: ['treble', 'bass'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Anchor on the line the clef names, then count. Speed comes from the
          anchor, not from reciting a mnemonic.`,
      },
    },

    apply: {
      text: `Two hands reading two clefs at once is the normal condition of keyboard
        music, and the reason it works is that both staves describe one continuous
        instrument rather than two separate ones.`,
      task: `Play a note in each hand from the example below, then find middle C with
        either hand and confirm it is the note in the gap between the two staves.`,
      example: { kind: 'chord', chordId: 'major', octave: 3 },
    },

    challenge: {
      drill: {
        kind: 'spell',
        prompt: `Same-looking position, different clef, and some of them carry an
          accidental. Name the note exactly.`,
        reps: 10,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'spelling', ids: ['C4', 'F3', 'G4', 'A3', 'Eb4', 'F#3', 'Bb3', 'C#4'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `The accidental never moves the note on the page. It only changes which
          key you play.`,
      },
    },

    review: {
      takeaways: [
        `Treble above, bass below, middle C in the gap.`,
        `The two staves are one continuous range with the middle line removed.`,
        `Read by anchoring on the clef's own note, then reading intervals from it.`,
      ],
      next: `Boot camp done. Everything from here is about distance between notes.`,
    },
  },
});

// -------------------------------------------------------------------------

export const WORLD_0 = defineWorld({
  id: 'world-0',
  number: 0,
  title: 'Music Boot Camp',
  tagline: 'Everything you need before anything else makes sense',
  blurb: `Note names, the shape of a keyboard, the two sizes of step, sharps and flats,
    and how all of it gets written down. Nine short lessons. No prior knowledge, no
    instrument required, though a keyboard on screen or in front of you helps.`,
  lessons: [L1, L2, L3, L4, L5, L6, L7, L8, L9],
});

export default WORLD_0;
