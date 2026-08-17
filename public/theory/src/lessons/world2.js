/**
 * WORLD 2. SCALE FORGE
 *
 * Ten microlessons that turn "a scale" from a list of notes into a formula.
 * World 1 established that an interval is measured twice, once in letters and
 * once in half steps. A scale is what happens when you apply that measurement
 * seven times in a fixed order, and a key signature is the bill that arrives
 * afterwards.
 *
 * The spine of the world is one claim, repeated: the step pattern fixes the
 * sound and the letter rule fixes the spelling, and between them there is
 * exactly one right answer for every key. That is why F sharp major contains
 * an E sharp. The engine is not being pedantic there. It is refusing to lose
 * information that the staff needs back.
 *
 * Two authoring notes.
 *
 * 1. Examples are recipes, so almost everything here inherits the session
 *    tonic and works in all twelve keys. Lessons 4 and 5 pin their tonic to
 *    F sharp and G flat, because in those two lessons a specific key is the
 *    subject rather than the setting.
 *
 * 2. The modes are taught twice on purpose. Lesson 8 rotates one parent scale,
 *    which is where the names come from. Lesson 9 holds the tonic still and
 *    compares, which is where the sound comes from. Neither lesson works
 *    without the other.
 */

import { defineLesson, defineWorld } from './schema.js';

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w2-l1-major-scale-pattern',
  world: 2,
  index: 1,
  minutes: 5,
  title: 'Seven Notes, Two Small Steps',
  subtitle: 'The major scale as a pattern rather than a list',
  teaches: ['major-scale'],
  requires: ['whole-step', 'second'],

  depths: {
    quick: `The major scale is one fixed order of steps, whole whole half whole whole whole half, run from any starting note.`,

    normal: `Play a major scale and you take seven steps to get back to your starting
      letter an octave up. Five of those steps are whole steps. Two are half steps, and
      they always land in the same two places: between the third note and the fourth, and
      between the seventh and the eighth. Learn where the two small steps go and you have
      learned every major scale there is.`,

    deep: `Most people first meet the major scale as the white keys from C to C, which is
      true and unhelpful. It ties the scale to one starting note and to a keyboard, when
      the thing your ear actually recognises is the sequence of distances. Those two half
      steps are what makes it recognisable. The one between 7 and 8 gives the scale its
      pull toward home, since a half step below a note sounds like it is leaning on it,
      and the one between 3 and 4 does the same job pointing downward. Move all of it up a
      few keys and nothing about the character changes, because the distances did not.`,

    nerd: `The pattern is not arbitrary and it is not quite the arbitrary-free story
      either. Take any note and stack six perfect fifths above it, then fold everything
      back into one octave. What you get is a major scale, though not on the note you
      started from: the tonic is the second link in the chain, which leaves the note you
      began on sitting at degree 4. That construction explains why the half steps cannot sit
      next to each other: the set is as evenly spread as seven notes chosen from twelve can be.
      It also quietly assumes equal temperament, where every fifth is the same size. In
      the tunings this scale grew up in, the whole steps came in two slightly different
      sizes, and the word "whole step" covered both. Nobody hears the difference on a
      modern keyboard because the keyboard has already made the compromise for you.`,
  },

  steps: {
    why: {
      text: `Twelve major scales, seven notes each, is eighty-four notes to memorise if
        you treat every key as its own fact. Treat it as one pattern instead and there is
        a single thing to remember, plus the ability to start it anywhere.`,
    },

    hear: {
      text: `A major scale, bottom to top. Listen to the last two notes especially, where
        the gap suddenly gets smaller and the scale arrives.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `The same notes on the keyboard, with the size of every gap shown. Two of the
        seven gaps are half the size of the others.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      views: ['piano', 'staff'],
      labelMode: 'semitones',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Walk up the scale one note at a time and note the size of each step. Then
          change the starting note and walk it again.`,
        noticing: `Five whole steps and two half steps, in the same order every time. The
          half steps arrive after the third note and after the seventh, wherever you
          started.`,
        views: ['piano', 'staff'],
        labelMode: 'semitones',
        controls: ['play', 'direction', 'tonic-picker', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'The major scale',
      text: `Seven notes built by the step pattern whole, whole, half, whole, whole,
        whole, half. The note you start from is the tonic, and it is what the scale is
        named after. Written as W W H W W W H, or as the semitone counts 2 2 1 2 2 2 1.`,
      symbol: 'W W H W W W H',
      alsoCalled: ['ionian', 'the do re mi scale'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Two neighbouring notes from a major scale. Whole step or half step?`,
        reps: 10,
        asks: 'step-size',
        mode: 'melodic-up',
        pool: { kind: 'step-size', ids: ['W', 'H'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `A half step sounds pinched, almost like one note bending. The whole step is
          wider, and it sounds like the opening of a scale because that is exactly what it
          is.`,
      },
    },

    apply: {
      text: `Anyone who has worked out a tune by ear has used this. You find the first
        note, then you are choosing between two step sizes at every move, and the pattern
        tells you which one is likely.`,
      task: `Play the scale below, then start again from a black key and build the same
        pattern by ear. Stop at each step and ask whether the next one is big or small.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Each statement claims a step size at a particular point in the scale. Some
          of them are wrong.`,
        reps: 8,
        asks: 'step-size',
        mode: 'visual',
        pool: { kind: 'step-size', ids: ['W', 'H'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        feedback: `Count from the tonic. Only two of the seven steps are half steps, and
          they sit after the third note and after the seventh.`,
      },
    },

    review: {
      takeaways: [
        `A major scale is a step pattern, not a list of notes.`,
        `Five whole steps and two half steps: W W H W W W H.`,
        `The half steps sit between 3 and 4, and between 7 and 8.`,
      ],
      next: `Run that pattern from a note other than C and black keys start appearing.
        Which of their two names you use is not a coin toss.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w2-l2-start-anywhere',
  world: 2,
  index: 2,
  minutes: 6,
  title: 'The Same Shape, A Different Home',
  subtitle: 'Why the accidentals turn up, and which ones',
  teaches: ['major-scale'],
  requires: ['major-scale', 'accidentals', 'staff'],

  depths: {
    quick: `Start the pattern anywhere and accidentals appear, because each degree has to take the next letter up.`,

    normal: `Build the pattern from G. You get G, A, B, C, D, E, and then the step to the
      seventh note has to be a whole step, which lands on a black key. That key has two
      names, F sharp and G flat, and only one of them is available: the seventh degree has
      to be some kind of F, because the sixth was an E and the eighth is a G. So G major
      contains F sharp. Start from F instead and the same reasoning gives you B flat.`,

    deep: `Two rules are running at once, and neither can be dropped. The step pattern
      decides which keys you press. Naming them is the second rule's job: seven degrees,
      seven different letters, in alphabetical order with no repeats and no gaps. Between
      them the spelling of every major scale is completely determined, which is
      worth pausing on. Nobody chose that G major uses F sharp rather than G flat. It falls
      out of building a scale whose notes sit on seven consecutive lines and spaces of the
      staff, one per degree. Spell it the other way and the page would show two Gs and no
      F at all, and a reader would have to decode instead of read.`,

    nerd: `The two rules together explain a fact that looks like a bureaucratic mess:
      there are fifteen written major keys for twelve sounds. C sharp major and D flat
      major are the same seven keys under your fingers, spelled with seven sharps and five
      flats respectively, and both exist because a piece already in a sharp region reads
      better in the sharp spelling. Push further and the system does break: G sharp major
      would need an F double sharp for its seventh, which is legal but unpleasant, so it
      gets written as A flat major and everyone moves on. The engine here does not consult
      a table for any of this. It asks for a major seventh above the tonic, and the
      letter arithmetic that lesson 2 of World 1 set up returns the only spelling that fits.`,
  },

  steps: {
    why: {
      text: `In C major the pattern costs nothing, because every note is a white key. The
        moment you start anywhere else you are choosing names as well as sounds, and the
        wrong name is not merely untidy. It makes the scale unreadable on a staff.`,
    },

    hear: {
      text: `The pattern again, from wherever you are working. Same shape, same character,
        different pitches.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `Read the letters going up. Each degree takes the next letter, and any
        accidental is there to keep the step sizes correct.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'letter-wheel',
        prompt: `Change the tonic and watch the seven letters that come out. Then try to
          force a spelling that uses the same letter twice.`,
        noticing: `Whatever tonic you pick, the seven letters appear once each and in
          order. Accidentals are whatever it takes to keep the pattern intact, which is
          why one key needs sharps and another needs flats.`,
        views: ['staff', 'piano'],
        labelMode: 'name',
        controls: ['tonic-picker', 'letter-slider', 'spelling-toggle', 'play', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'One letter per degree',
      text: `A scale uses each letter name exactly once, in alphabetical order, wrapping
        from G back to A. Accidentals adjust the pitch without touching the letter. This
        is what people mean by spelling a scale correctly, and it is a rule about
        readability rather than about sound.`,
      alsoCalled: ['scale spelling', 'diatonic spelling'],
    },

    practice: {
      drill: {
        kind: 'spell',
        prompt: `Spell the third degree of the major scale on this note.`,
        reps: 10,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'spelling', ids: ['G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'B'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Count two letters up from the tonic first, then decide the accidental.
          Getting the letter right is most of the work.`,
      },
    },

    apply: {
      text: `A singer says the song sits too high. You move it down, and every note keeps
        its degree number while every letter changes. Doing that on paper is exactly this
        lesson, applied once per note.`,
      task: `Play the short figure below, then rebuild the scale from a new tonic and play
        the same degree numbers. Write down the two spellings and compare which letters
        picked up accidentals.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 6, 5] },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Build the whole major scale from the note given, spelling every degree.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['major'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Some keys need a spelling that looks wrong and is not. A scale on G flat
          contains a C flat, because its fourth degree has to be a kind of C.`,
      },
    },

    review: {
      takeaways: [
        `The step pattern fixes the sounds; the letter rule fixes the names.`,
        `Every degree takes the next letter, with no repeats and no gaps.`,
        `Which accidental a key needs is a consequence, not a choice.`,
      ],
      next: `Once every scale has the same shape, the notes can be numbered, and the
        numbers work in all twelve keys at once.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w2-l3-scale-degrees',
  world: 2,
  index: 3,
  minutes: 5,
  title: 'Numbers Beat Letters',
  subtitle: 'Scale degrees, and why anyone bothers',
  teaches: ['scale-degrees'],
  requires: ['major-scale', 'two-number-rule'],

  depths: {
    quick: `Number the notes of a scale from the tonic and you can describe music in all twelve keys at once.`,

    normal: `Count the notes of a scale upward from the tonic and you get degrees 1 to 7,
      with 8 being the tonic again an octave higher. Degree 1 is home. Five is the
      strongest note after it, and 7 sits a half step below home and sounds like it is
      being pulled there, which is why it is called the leading tone. Talk in numbers and
      the same sentence describes a tune in every key.`,

    deep: `The number attached to a degree is the interval number from the tonic, which is
      why this lesson needs the two rulers from World 1. Degree 3 of a major scale is a
      major third above the tonic. In a minor scale, degree 3 is a minor third above it
      and is still degree 3, because a scale has seven degrees whatever their qualities
      are. That is the point where beginners quietly go wrong: they hear "the third" and think
      of a fixed distance, when it names a position in the scale. When a musician needs to
      be precise about the difference they say flat three, meaning degree 3 lowered against
      the major version, and every scale in this course is described that way.`,

    nerd: `The degrees have Latin-derived names that survive mostly in classical writing:
      tonic, supertonic, mediant, subdominant, dominant, submediant, leading tone. Two are
      worth decoding. Mediant means middle, because degree 3 sits halfway between the tonic
      and the dominant. Subdominant means the fifth measured downward from the tonic, not
      the note below the dominant, which is a coincidence people misremember constantly.
      The seventh degree changes name when it is lowered a half step: it stops being a
      leading tone and becomes a subtonic, since it no longer leads anywhere. Jazz notation
      leans on a different convention again, writing degrees as numbers with accidentals in
      front, so a flat nine is degree 2 lowered and voiced an octave up.`,
  },

  steps: {
    why: {
      text: `Saying "the F sharp" only helps someone playing in the same key as you. Call it
        "the seventh" and everyone can use it, and the word says something about the note's
        job rather than its pitch.`,
    },

    hear: {
      text: `The tonic, the fifth, then the seventh and the note above it. Listen to how
        badly the seventh wants to move that last half step.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 5, 7, 8] },
      playback: 'sequence',
    },

    see: {
      text: `The scale with each note numbered from home. Degree 8 is degree 1 again, so
        the numbering wraps in exactly the way the letters do.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      views: ['piano', 'staff'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Move the tonic around and watch the numbers. Then compare degree 7 with
          degree 8, and degree 3 with degree 4.`,
        noticing: `The numbers stay put while the note names change completely. Degrees 3
          and 7 each sit a half step below their neighbour above, which is where the two
          small steps of the pattern ended up.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Scale degree',
      text: `A note's position in its scale, counted from the tonic. Degrees 1 to 7, with
        1 also called the tonic, 5 the dominant and 7 the leading tone. A degree written
        with a flat or a sharp in front, such as flat 3, means that degree lowered or
        raised against the major scale on the same tonic.`,
      symbol: '1 2 3 4 5 6 7',
      alsoCalled: ['tonic', 'dominant', 'leading tone', 'degree numbers'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Name the note sitting on the degree shown.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['major'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        feedback: `Count up from the tonic, including the tonic as 1. Degree 5 is four
          letters above degree 1, which trips people up until it stops doing so.`,
      },
    },

    apply: {
      text: `Session musicians call out numbers rather than chords for a reason: the same
        instruction works whatever key the singer needs. A melody stored as degrees is a
        melody you can play anywhere.`,
      task: `Play the figure below, note its degree numbers, then move to a different
        tonic and play the same numbers. The tune should survive intact.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 6, 5, 3, 1] },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `The tonic, then one other note of the scale. Name the second note.`,
        reps: 8,
        asks: 'note-name',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['major'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Judge the degree first and convert to a name afterwards. Degrees 5 and 8
          are the easiest anchors, and 7 gives itself away by leaning upward.`,
      },
    },

    review: {
      takeaways: [
        `Degrees number a scale from the tonic, 1 to 7.`,
        `A degree names a position, so degree 3 can be a major or a minor third.`,
        `Degree 7 leans into 8, which is why it is called the leading tone.`,
      ],
      next: `The accidentals a key needs are always the same ones, so they get written down
        once instead of on every note.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w2-l4-key-signatures',
  world: 2,
  index: 4,
  minutes: 6,
  title: 'The Bill Arrives at the Front',
  subtitle: 'Key signatures as the consequence of spelling a scale',
  teaches: ['key-signature'],
  requires: ['major-scale', 'scale-degrees', 'staff', 'accidentals'],

  depths: {
    quick: `A key signature is the set of accidentals a scale needs, collected at the start of the line instead of written on every note.`,

    normal: `Build a major scale on G and one note comes out altered, F sharp. Rather than
      writing a sharp in front of every F for the length of the piece, the sharp goes once
      at the front of each line and applies to every F until told otherwise. That is all a
      key signature is. It has no independent existence: build the scale, see which letters
      picked up an accidental, and you have derived it.`,

    deep: `The interesting case is F sharp major. Its seventh degree must be a kind of E,
      because degree 6 was a D sharp and degree 8 is F sharp again, so the note a half step
      below F sharp gets written as E sharp rather than F natural. Six sharps, and the last
      of them is on a letter that most people think of as a white key. Nothing is being
      awkward. The alternative spelling would put two Fs in the scale and no E, and a
      player reading it would lose the one thing the staff is good at, which is showing you
      a scale as seven steps up a ladder. Every signature in this course is derived that way
      rather than stored in a table, so it cannot quietly disagree with the scale it just
      built.`,

    nerd: `A signature does not actually tell you the key. It narrows the field to two
      candidates, a major key and its relative minor, and only the music decides which,
      which is World 4's problem. Beyond that, plenty of real music uses a signature
      loosely: modal folk tunes are often written with the signature of the parent major
      scale and a persistent accidental, and blues writes a major signature over a melody
      full of lowered thirds. Two mechanical details worth knowing. A signature applies to
      every octave of the letter, unlike an accidental written in a bar, which applies only
      to its own octave until the barline. And a natural sign in a signature is used only
      when cancelling a previous one during a key change, which is why old editions look
      cluttered at exactly those moments.`,
  },

  steps: {
    why: {
      text: `A piece in a key with five sharps would otherwise need an accidental in front
        of most of its notes. Nobody could read that, and nobody would notice the one
        accidental that actually mattered.`,
    },

    hear: {
      text: `F sharp major, from the bottom. Six sharps on the page, and the sound is a
        plain major scale like any other.`,
      example: { kind: 'scale', scaleId: 'major', tonic: 'F#', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `Now the spelling. Read the seventh degree: it is written E sharp, because a
        seventh above F sharp has to be a kind of E, and it sits on the E line.`,
      example: { kind: 'scale', scaleId: 'major', tonic: 'F#', includeOctave: true },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'staff-plotter',
        prompt: `Plot a major scale degree by degree, then move the tonic up by a fifth and
          plot it again. Keep a note of which letters end up altered.`,
        noticing: `Each move up a fifth adds exactly one accidental, and it is added to a
          letter that was untouched before. The accidentals accumulate rather than
          shuffling around.`,
        views: ['staff', 'piano'],
        labelMode: 'name',
        controls: ['tonic-picker', 'play', 'spelling-toggle', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Key signature',
      text: `The sharps or flats belonging to a key, written after the clef at the start of
        every line. Each one applies to its letter in every octave, for the whole piece or
        until a new signature replaces it. A key uses sharps or flats, never a mixture.`,
      alsoCalled: ['the signature', 'the key'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Name the accidental this major key puts on its seventh degree, or on its
          fourth if the key runs on flats.`,
        reps: 10,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'spelling', ids: ['G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Build the scale and read that one degree off it. Every sharp key alters
          its seventh and every flat key alters its fourth, without exception. That is also
          the newest accidental the key picked up, which is what makes it the useful one.`,
      },
    },

    apply: {
      text: `Reading is where this pays. A signature of four sharps means you stop treating
        F, C, G and D as white keys for the duration, and your hand adjusts once rather
        than note by note.`,
      task: `Play the scale below while reading only the signature, with no accidentals
        written in. Then find a note the signature altered and check that you played it
        without thinking about it.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Each statement names a note inside a key. Some of them use a spelling the
          key cannot contain.`,
        reps: 8,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'spelling', ids: ['E#', 'B#', 'Cb', 'Fb'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Work out which degree the note would be and check its letter. F sharp
          major contains an E sharp and no F natural, and G flat major contains a C flat.`,
      },
    },

    review: {
      takeaways: [
        `A key signature is derived from the scale, not memorised separately.`,
        `Every letter appears once, so some keys need spellings like E sharp.`,
        `The signature applies to its letters in all octaves until it changes.`,
      ],
      next: `Signatures are written in a fixed order, and that order is a map of how the
        keys are related.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w2-l5-reading-signatures',
  world: 2,
  index: 5,
  minutes: 5,
  title: 'Reading the Front of the Line',
  subtitle: 'The order of sharps and flats, and two names for one sound',
  teaches: ['key-signature'],
  requires: ['key-signature', 'scale-degrees', 'enharmonic-spelling'],

  depths: {
    quick: `Sharps are always written in the order F C G D A E B, and flats in exactly the reverse.`,

    normal: `Sharps arrive in the order F, C, G, D, A, E, B. A key with three sharps has F,
      C and G sharp, always those three and always in that order on the page. Flats run the
      same list backwards: B, E, A, D, G, C, F. Two shortcuts follow. The last sharp is
      the seventh degree, so the tonic is a half step above it. In flat keys, the
      second-to-last flat is the tonic outright.`,

    deep: `The order is not a convention someone invented for tidiness. Each new sharp key
      sits a fifth above the last, and each new key alters exactly one more letter, which
      is why the sharps themselves march up in fifths: F, C, G, D and so on. The flat order
      is the same walk in the other direction. Both shortcuts for finding the tonic fall
      straight out of that. The last sharp added is always the leading tone of the new key,
      so stepping up a half step from it lands on home, and in flat keys the newest flat is
      always degree 4, which leaves the previous flat sitting on degree 1.`,

    nerd: `Six sharps and six flats meet in the middle, which is why F sharp major and G
      flat major exist side by side as the same twelve-tone sound spelled two ways. Which
      one gets used is practical rather than principled: brass and reed players read flats
      more comfortably, string players usually prefer sharps, and an arranger picks the
      spelling that keeps the accidentals inside the piece readable. C flat major with
      seven flats survives mainly because a piece already deep in flat territory would need
      awkward respelling to escape it. Worth one caveat: on an equally tempered keyboard
      the two spellings are identical sounds, but in the unequal temperaments this notation
      grew up in they were not, and some historical writing about the character of
      particular keys is describing that difference rather than imagining it.`,
  },

  steps: {
    why: {
      text: `A signature has to be recognised at a glance, in the second before the music
        starts. That works because the accidentals never appear in a random order, so the
        count and the last one are enough to identify the key.`,
    },

    hear: {
      text: `G flat major. Compare it with the F sharp major scale from the previous
        lesson: identical keys under the fingers, six flats on the page instead of six
        sharps.`,
      example: { kind: 'scale', scaleId: 'major', tonic: 'Gb', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `One sound, two names. The staff has to commit to one of them, and that choice
        is what decides whether the piece is written with sharps or flats.`,
      example: { kind: 'enharmonics', tonic: 'F#' },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'enharmonic-flip',
        prompt: `Take a scale and flip it to its other spelling. Count the accidentals in
          each version, then play both.`,
        noticing: `Flipping the spelling changes the signature and does not change a single
          sound. One version is usually far less cluttered than the other, and that is the
          whole basis for choosing.`,
        views: ['staff', 'piano', 'pitchring'],
        labelMode: 'name',
        controls: ['spelling-toggle', 'play', 'compare', 'reveal', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'The order of sharps and flats',
      text: `Sharps: F C G D A E B. Flats: B E A D G C F. Each list is the other reversed,
        and each step along a list is a fifth. To name a major key, go a half step above
        the last sharp, or read the second-to-last flat.`,
      symbol: 'F C G D A E B',
      alsoCalled: ['the order of accidentals'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Given the last sharp, or the second-to-last flat, name the major key.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: ['F#', 'C#', 'G#', 'D#', 'A#', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
        views: ['staff'],
        labelMode: 'name',
        feedback: `One sharp is F sharp, so the key is G. A single flat is B flat, and the
          second-to-last trick has nothing to read there, so that key is worth memorising
          as F.`,
      },
    },

    apply: {
      text: `Charts get handed out sixty seconds before a take. Reading the signature is
        how you know which notes to expect, and the order means you rarely have to look at
        more than the last accidental.`,
      task: `Look at the signature for the scale below without playing it. Say the key out
        loud, then play the scale and check whether your hand agreed with you.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Two key names. Same sounds, or genuinely different keys?`,
        reps: 8,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'spelling', ids: ['F#', 'Gb', 'C#', 'Db', 'B', 'Cb'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Count the accidentals each one needs. If the two counts add up to twelve
          you are looking at the same twelve-tone sound spelled two ways.`,
      },
    },

    review: {
      takeaways: [
        `Sharps go F C G D A E B, flats the same list backwards.`,
        `Last sharp plus a half step gives the major key; the second-to-last flat is it.`,
        `Enharmonic keys sound the same and are chosen for readability.`,
      ],
      next: `Everything so far has been major. Lowering three degrees changes the mood
        entirely, and there is more than one way to do it.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w2-l6-natural-minor',
  world: 2,
  index: 6,
  minutes: 5,
  title: 'Minor, Plainly',
  subtitle: 'The natural minor scale and the note that does the work',
  teaches: ['minor-scales'],
  requires: ['major-scale', 'scale-degrees', 'third'],

  depths: {
    quick: `Natural minor is the major scale with degrees 3, 6 and 7 each lowered a half step.`,

    normal: `Take a major scale and lower the third, sixth and seventh by a half step. That
      is natural minor. Its step pattern is W H W W H W W, and the third is the note doing
      almost all of the work: lower that one alone and the scale already sounds minor.
      Lowering 6 and 7 as well deepens the effect and removes the leading tone.`,

    deep: `There is a second route to the same scale, and it is worth knowing both. Start a
      major scale on its sixth degree, keep going for an octave, and you have a natural
      minor scale using exactly the same seven notes. That is why a minor key shares its
      signature with a major key, and why a signature cannot tell you which of the two you
      are in. The two descriptions answer different questions. Lowering degrees tells you
      what the scale sounds like compared with major on the same home note. Rotating tells
      you where its notes came from. A player thinking about the sound wants the first one;
      a reader working out a signature wants the second.`,

    nerd: `Natural minor is also the mode called aeolian, and the two names mean the same
      collection with different emphasis: minor names a key you can write a piece in, while
      aeolian names a colour you can borrow for eight bars. Be careful with a piece marked
      as being in a minor key, because it will almost never stay natural. The seventh
      degree gets raised whenever the harmony wants a leading tone, which the next lesson
      is about, so real music in A minor contains both G and G sharp depending on the bar.
      That is a genuine untidiness in the theory rather than a simplification made for
      beginners: minor is a family of related scales that share a tonic and a signature.`,
  },

  steps: {
    why: {
      text: `Roughly half of the music anyone wants to play is not major, and describing it
        as "sad major" gets you nowhere. There is a specific pattern behind the mood, and
        it differs from the major pattern in exactly three places.`,
    },

    hear: {
      text: `A natural minor scale on the same tonic you have been using. The change of
        character arrives on the third note.`,
      example: { kind: 'scale', scaleId: 'aeolian', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `The degrees, labelled against the major scale. Three of them carry a flat,
        meaning lowered from major rather than necessarily written with a flat sign.`,
      example: { kind: 'scale', scaleId: 'aeolian', includeOctave: true },
      views: ['piano', 'staff'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'quality-shifter',
        prompt: `Start from a major scale. Lower the third alone and listen. Then lower the
          sixth, then the seventh.`,
        noticing: `The third alone flips the verdict from bright to dark. Lowering 6 and 7
          deepens it and takes away the half-step pull into the tonic, so the scale sounds
          less like it is heading anywhere.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['accidental-step', 'compare', 'play', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Natural minor',
      text: `Degrees 1, 2, flat 3, 4, 5, flat 6, flat 7, giving the step pattern
        W H W W H W W. Called natural to distinguish it from the two altered forms in the
        next lesson, and called aeolian when it is being treated as a mode.`,
      symbol: '1 2 ♭3 4 5 ♭6 ♭7',
      alsoCalled: ['aeolian', 'pure minor', 'the relative minor scale'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Major or natural minor?`,
        reps: 10,
        asks: 'same-different',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['major', 'aeolian'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Listen to the third note. Everything after it confirms what the third
          already told you.`,
      },
    },

    apply: {
      text: `Play a major scale starting from its sixth degree and you are playing natural
        minor without changing a single note. Guitarists and pianists both use this to get
        a minor sound out of a shape they already know.`,
      task: `Play the notes below, which are a major scale from its sixth degree upward.
        Hold that sixth degree underneath as a drone and listen to it become home.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [6, 7, 8, 9, 10, 11, 12, 13] },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Build a natural minor scale from the note given, spelling every degree.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['aeolian'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Lowered does not mean written with a flat. The third degree of a minor
          scale on F sharp is A natural, and it is still the flat third.`,
      },
    },

    review: {
      takeaways: [
        `Natural minor lowers degrees 3, 6 and 7 of the major scale.`,
        `Its step pattern is W H W W H W W.`,
        `The same seven notes as the major scale a minor third above it.`,
      ],
      next: `Losing the leading tone costs something, and composers went to some trouble to
        get it back.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w2-l7-harmonic-melodic-minor',
  world: 2,
  index: 7,
  minutes: 7,
  title: 'Two Repairs to the Minor Scale',
  subtitle: 'Harmonic and melodic minor, and what each one fixes',
  teaches: ['minor-scales'],
  requires: ['minor-scales', 'seventh'],

  depths: {
    quick: `Harmonic minor raises the seventh to get the leading tone back; melodic minor raises the sixth as well to smooth the gap that leaves.`,

    normal: `Natural minor has a flat seventh, a whole step below the tonic, so it does not
      lean into home the way a major scale does. Raise that seventh by a half step and you
      have harmonic minor, with the pull restored. The cost is the gap below it: from the
      flat sixth up to the raised seventh is now three half steps, a step and a half in one
      move. Raise the sixth as well and every step is back to a whole or a half. That
      version is melodic minor.`,

    deep: `Both scales exist because of harmony rather than melody, despite the names. The
      chord built on degree 5 is what announces an arrival home, and it needs the raised
      seventh to do its job, so harmonic minor is the scale that supports that chord. What
      it produces along the way is the interval from flat 6 to raised 7, three half steps
      across two letters, which World 1 named an augmented second. Singers dislike it and
      it is unmistakably the sound most people label exotic. Melodic minor solves it by
      raising the sixth too, at which point the top half of the scale is identical to major
      and only the third is still lowered.`,

    nerd: `Classical practice uses melodic minor going up and reverts to natural minor
      coming down, on the reasoning that the raised notes exist to push toward the tonic
      and there is nothing to push toward on the way back. The engine here defines the
      ascending form only, so the melodic minor you hear above is that form in both
      directions, which is also exactly what jazz players mean when they say melodic
      minor. Treated as a scale in its own right it earns the name jazz minor and generates
      a family of modes: start it on its fourth degree for lydian dominant, on its seventh
      for the altered scale. Harmonic minor has its own rotations too, and the one on
      degree 5 is the standard sound over a dominant chord resolving to minor.`,
  },

  steps: {
    why: {
      text: `Play a natural minor scale up to the top and it arrives without ceremony,
        because the note below the tonic is a whole step away and does not lean. Major
        gets an ending that sounds like an ending. Minor had to be repaired to match.`,
    },

    hear: {
      text: `Harmonic minor. Everything is as before until the sixth note, and then the
        step up to the seventh stretches into something much wider than a whole step.`,
      example: { kind: 'scale', scaleId: 'harmonic-minor', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `Melodic minor on the page, labelled by degree. Compare it with major on the
        same tonic: only the third is still lowered.`,
      example: { kind: 'scale', scaleId: 'melodic-minor', includeOctave: true },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'accidental-lab',
        prompt: `Start from natural minor. Raise the seventh degree and check the size of
          the two steps around it. Then raise the sixth as well.`,
        noticing: `Raising 7 shrinks the last step to a half step and stretches the one before
          it to three half steps. Lift the sixth as well and no gap is bigger than a whole
          step, with the top half of the scale matching major exactly.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['accidental-step', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'aeolian', includeOctave: true },
      },
    },

    name: {
      term: 'Harmonic and melodic minor',
      text: `Harmonic minor: 1, 2, flat 3, 4, 5, flat 6, 7, with a step and a half between
        the last two. Melodic minor: 1, 2, flat 3, 4, 5, 6, 7, which is a major scale with
        a lowered third. Classical writing descends melodic minor as natural minor; jazz
        keeps the raised form in both directions.`,
      symbol: '1 2 ♭3 4 5 ♭6 7 / 1 2 ♭3 4 5 6 7',
      alsoCalled: ['jazz minor', 'the raised seventh'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Natural, harmonic or melodic minor?`,
        reps: 10,
        asks: 'same-different',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['aeolian', 'harmonic-minor', 'melodic-minor'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Harmonic minor gives itself away with the lurch between degrees 6 and 7.
          Melodic minor sounds almost major until the third arrives.`,
      },
    },

    apply: {
      text: `The raised seventh exists to make the chord on degree 5 major, which is what
        gives a minor key an ending with real gravity. Three notes below are that chord,
        taken straight out of harmonic minor.`,
      task: `Play those three notes together, then play the tonic underneath them. The pull
        you hear is the raised seventh doing the job it was raised for.`,
      example: { kind: 'degrees', scaleId: 'harmonic-minor', degrees: [5, 7, 9] },
    },

    challenge: {
      drill: {
        kind: 'spell',
        prompt: `Spell the sixth and seventh degrees of this scale from the tonic given.`,
        reps: 8,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['harmonic-minor', 'melodic-minor'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Raising a degree never changes its letter. The seventh of G harmonic
          minor is F sharp, and in some keys the raised seventh needs a double sharp.`,
      },
    },

    review: {
      takeaways: [
        `Harmonic minor raises 7, restoring the leading tone.`,
        `That leaves a step and a half between flat 6 and 7, an augmented second.`,
        `Melodic minor raises 6 too, giving a major scale with a lowered third.`,
      ],
      next: `Rotating a scale to start on a different degree turned natural minor out of
        major. Doing that on purpose, seven times, gives you the modes.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w2-l8-modes-as-rotations',
  world: 2,
  index: 8,
  minutes: 6,
  title: 'Same Notes, Different Home',
  subtitle: 'Modes as rotations of one parent scale',
  teaches: ['modes'],
  requires: ['major-scale', 'scale-degrees', 'minor-scales'],

  depths: {
    quick: `Start a major scale on one of its own notes other than the tonic and you get a mode.`,

    normal: `Play the notes of one major scale but treat a different one of them as home.
      Starting on degree 2 gives dorian, on degree 3 phrygian, on 4 lydian, on 5
      mixolydian, on 6 aeolian and on 7 locrian. Degree 1 is the major scale itself, called
      ionian when it is counted among the others. Seven rotations, one set of notes. What
      changes each time is the order of whole and half steps above home.`,

    deep: `What makes a mode a mode is which note behaves as home, and that is not decided
      by the notes alone. Play the white keys from D to D with a C sounding underneath
      and you hear C major with an odd starting point. Put a D underneath instead and the
      character changes completely, because the two half steps now sit in different places
      relative to home. Rotation is the mechanism, not the effect. Without something to
      establish the new tonic, a bass note, a chord, a repeated arrival, you have played
      the parent scale from an unusual place and nothing more.`,

    nerd: `The names are Greek and the modern usage is loosely descended from medieval
      church modes, which is a longer story than it is usually given credit for. Those
      modes were defined by a final, a reciting tone and a range, and came in paired
      authentic and plagal forms, so dorian in a manuscript from 1200 is not the scale a
      guitarist means today. Locrian is the odd one out even now: its fifth above the tonic
      is diminished, so it has no stable chord to sit on and it is used mostly over a
      half-diminished chord rather than as a key. Rotation works on any scale, and the
      table behind this app includes several rotations of melodic minor because jazz
      practice made them worth naming.`,
  },

  steps: {
    why: {
      text: `Two pieces can use identical notes and sound nothing alike. That is not a
        mystery about taste. It is about which note the music keeps returning to, and
        naming the seven possibilities is what the modes do.`,
    },

    hear: {
      text: `A major scale, played from its second degree up to the same degree an octave
        higher. Nothing has been added or removed. The starting point moved.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [2, 3, 4, 5, 6, 7, 8, 9] },
      playback: 'sequence',
    },

    see: {
      text: `The same rotation, labelled with degrees of the parent scale. Watch where the
        two half steps fall when degree 2 is the starting point.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [2, 3, 4, 5, 6, 7, 8, 9] },
      views: ['piano', 'staff'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Walk two octaves of one major scale, starting from a different degree each
          time, and record the step pattern you get.`,
        noticing: `The half steps never move on the keyboard. What changes is where they
          land relative to your starting note, and that alone is what makes each rotation
          sound like a different scale.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['direction', 'play', 'tonic-picker', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', octaves: 2 },
      },
    },

    name: {
      term: 'Mode',
      text: `A scale made by treating a different degree of a parent scale as home. From
        the major scale, in order: ionian, dorian, phrygian, lydian, mixolydian, aeolian,
        locrian. Two of them have other names you already know, since ionian is the major
        scale and aeolian is natural minor.`,
      alsoCalled: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Which note of the parent major scale does this mode start on?`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        feedback: `Count the degrees in order and the names go with them. Dorian is 2,
          phrygian 3, lydian 4, mixolydian 5, aeolian 6, locrian 7.`,
      },
    },

    apply: {
      text: `Folk and film music both lean on this. A tune written on the white keys that
        keeps landing on D is in D dorian, and it needs no accidentals and no explanation
        beyond where it comes to rest.`,
      task: `Play the figure below, which sits on degree 2 of the parent scale. Hold that
        note underneath, then hold the parent tonic instead, and listen to the same notes
        change meaning.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [2, 4, 6, 4, 2] },
    },

    challenge: {
      drill: {
        kind: 'match',
        prompt: `Match each mode to the degree of the parent major scale it starts from.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        feedback: `If a name will not stick, build the rotation and look at where its half
          steps land. Lydian is the one whose fourth degree is raised.`,
      },
    },

    review: {
      takeaways: [
        `A mode is one parent scale treated as if a different note were home.`,
        `Seven degrees give seven modes, two of which you already knew.`,
        `Rotation alone does nothing until something establishes the new home.`,
      ],
      next: `Rotations explain where modes come from and teach your ear almost nothing.
        Holding the tonic still is what makes them audible.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w2-l9-modes-on-one-tonic',
  world: 2,
  index: 9,
  minutes: 6,
  title: 'One Note at a Time',
  subtitle: 'Comparing modes on a fixed tonic',
  teaches: ['modes'],
  requires: ['modes', 'minor-scales'],

  depths: {
    quick: `Hold the tonic still and each mode differs from a scale you already know by exactly one note.`,

    normal: `Comparing modes on the same tonic is what makes them audible. Against a major
      scale, lydian moves one note, the fourth, up a half step. Mixolydian moves one note,
      the seventh, down. Dorian is two notes from major and only one from natural minor,
      where its sixth is raised, so compare it there. Phrygian is natural minor with a
      lowered second, and locrian is phrygian with a lowered fifth.`,

    deep: `Rotating a scale changes everything about how it sits over a tonic, so an ear
      cannot learn much from it. Fix the tonic and the comparison becomes single-variable:
      one note moved, and that note is what you are hearing. Players call it the
      characteristic note, and leaning on it is how a solo announces a mode rather than
      hinting at it. The chain matters too. Dorian is not one note from major, whatever the
      symmetry of the seven names suggests, and pretending otherwise leaves a learner
      listening for a difference too big to isolate. Compare each mode with its nearest
      neighbour and every step is one note wide.`,

    nerd: `Order the modes from brightest to darkest and you get lydian, ionian,
      mixolydian, dorian, aeolian, phrygian, locrian, with each one lowering a single
      degree against the one before it. That is the same walk as moving down by fifths,
      which is why the sequence feels orderly rather than arbitrary. Two practical warnings. A mode needs harmony that
      agrees with it, since a raised fourth over a plain major chord sounds like a passing
      wrong note rather than lydian. And modal music tends to avoid the strong dominant to
      tonic motion of a major key, because that motion is so good at asserting a different
      home that it can drag the ear back to the parent scale within two bars.`,
  },

  steps: {
    why: {
      text: `Knowing that dorian starts on degree 2 will not help you recognise dorian.
        Your ear does not hear rotations. It hears one note being different from what it
        expected, and that is how modes have to be taught if they are going to stick.`,
    },

    hear: {
      text: `Lydian on the tonic you have been working with. Against the major scale from
        lesson 1, exactly one note has moved, and it is the fourth.`,
      example: { kind: 'scale', scaleId: 'lydian', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `Mixolydian, labelled by degree. Six degrees match the major scale and the
        seventh is lowered, which is the entire difference.`,
      example: { kind: 'scale', scaleId: 'mixolydian', includeOctave: true },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Put dorian next to natural minor on the same tonic and find the note that
          differs. Then compare dorian with major and count how many notes differ.`,
        noticing: `Dorian is one note from natural minor, the raised sixth, and two notes
          from major. Comparing it with the nearer of the two is what lets you hear the
          change instead of guessing at it.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['compare', 'tonic-picker', 'play', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'dorian', includeOctave: true },
      },
    },

    name: {
      term: 'Characteristic note',
      text: `The single degree that separates a mode from its nearest familiar neighbour.
        Lydian has a raised fourth against major, mixolydian a lowered seventh. Dorian has
        a raised sixth against natural minor, phrygian a lowered second, and locrian adds a
        lowered fifth to phrygian.`,
      alsoCalled: ['the colour note', 'the characteristic degree'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Major, lydian or mixolydian, all on the same tonic. Name the note that
          differs from major.`,
        reps: 10,
        asks: 'note-name',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['major', 'lydian', 'mixolydian'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Sing the major scale in your head first. Lydian trips you at the fourth
          note going up; mixolydian waits until the seventh.`,
      },
    },

    apply: {
      text: `Writing in a mode means putting the characteristic note somewhere it cannot be
        missed. A melody that carefully avoids the raised fourth is not lydian, whatever
        the scale it was drawn from.`,
      task: `Play the tonic chord below, then the characteristic note over the top of it,
        and hold both. The mode is that sound, and everything else is context for it.`,
      example: { kind: 'degrees', scaleId: 'lydian', degrees: [1, 3, 5, 11] },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `The darker four, all on one tonic. Name the degree that gives each one
          its colour.`,
        reps: 8,
        asks: 'note-name',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['aeolian', 'dorian', 'phrygian', 'locrian'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Against natural minor, dorian brightens the sixth and phrygian darkens
          the second. Locrian goes further still, lowering the fifth on top of the second.
          Listen to the second note before anything else.`,
      },
    },

    review: {
      takeaways: [
        `On a fixed tonic, each mode is one note from its nearest neighbour.`,
        `Lydian raises 4, mixolydian lowers 7, dorian raises 6, phrygian lowers 2.`,
        `The characteristic note is what a player leans on to make the mode heard.`,
      ],
      next: `Removing notes turns out to be as useful as altering them, and there are two
        in the major scale that cause most of the trouble.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L10 = defineLesson({
  id: 'w2-l10-pentatonic',
  world: 2,
  index: 10,
  minutes: 5,
  title: 'Five Notes That Never Argue',
  subtitle: 'Pentatonics, and the two notes they leave out',
  teaches: ['pentatonic'],
  requires: ['major-scale', 'scale-degrees', 'tritone'],

  depths: {
    quick: `Take degrees 4 and 7 out of a major scale and the five that remain sit a whole step or more apart.`,

    normal: `Major pentatonic is degrees 1, 2, 3, 5 and 6. The two notes left out are the
      fourth and the seventh, which happen to be the pair that forms a tritone. With them
      gone the scale has no half steps at all, so no two notes are close enough to grind
      against each other. Minor pentatonic is the same idea applied to natural minor: keep
      1, flat 3, 4, 5 and flat 7, and drop the second and the flat sixth.`,

    deep: `Degrees 4 and 7 are the most opinionated notes in the major scale. The seventh
      leans up into the tonic, the fourth leans down into the third, and together they form
      the tritone that makes a dominant chord restless. Remove them and you have removed
      the scale's sense of direction along with its capacity to clash. That is the trade.
      A pentatonic melody floats, fits over several chords at once, and is very hard to
      make sound wrong, which is exactly why it is handed to beginners and used by
      improvisers who want one shape to cover a whole progression. What you give up is the
      pull that tells a listener a phrase has finished.`,

    nerd: `Five-note scales built from consecutive fifths turn up independently across
      musical traditions with no plausible contact between them, which suggests the
      construction is being found rather than invented. The black keys of a piano are one:
      G flat, A flat, B flat, D flat, E flat, a major pentatonic on G flat and a minor
      pentatonic on E flat. Those two names describe the same five sounds with different
      home notes, in the same way that a major scale and its relative minor do. Add the
      note between degrees 4 and 5 of a minor pentatonic and you have the blues scale,
      which is where the tidy account starts to leak: blues practice puts a lowered third
      over a major chord on purpose, and no arrangement of scale degrees explains why that
      sounds good rather than wrong.`,
  },

  steps: {
    why: {
      text: `Handed a seven-note scale and a backing track, most beginners still play notes
        that clash, because two of the seven are demanding and need handling. Remove those
        two and the problem disappears without anyone learning anything difficult.`,
    },

    hear: {
      text: `Five notes and the octave. Nothing in it sounds like it needs to resolve,
        because nothing in it is a half step from anything else.`,
      example: { kind: 'scale', scaleId: 'major-pentatonic' },
      playback: 'sequence',
    },

    see: {
      text: `Degrees 1, 2, 3, 5 and 6. The gaps where 4 and 7 used to be are visible as the
        two wide steps, each a step and a half.`,
      example: { kind: 'scale', scaleId: 'major-pentatonic' },
      views: ['piano', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Play the five notes in any order over a held tonic. Then add the fourth
          and the seventh back in and try again.`,
        noticing: `With five notes, order barely matters and nothing sounds like a mistake.
          Put 4 and 7 back and both of them immediately demand to go somewhere, which is
          what makes a seven-note scale expressive and harder to handle.`,
        views: ['piano', 'pitchring', 'fretboard'],
        labelMode: 'degree',
        controls: ['play', 'tonic-picker', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major-pentatonic' },
      },
    },

    name: {
      term: 'Pentatonic scale',
      text: `Any five-note scale, though in practice the word means one of two. Major
        pentatonic is 1, 2, 3, 5, 6. Minor pentatonic is 1, flat 3, 4, 5, flat 7. Both have
        the same five sounds when their tonics are a minor third apart, so the name you use
        depends on which note the music treats as home.`,
      symbol: '1 2 3 5 6',
      alsoCalled: ['major pentatonic', 'minor pentatonic'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `Build the pentatonic scale named, from the tonic given.`,
        reps: 10,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['major-pentatonic', 'minor-pentatonic'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        feedback: `Build the seven-note scale first and then drop two degrees. For major
          drop 4 and 7; for minor drop 2 and flat 6.`,
      },
    },

    apply: {
      text: `One minor pentatonic will sit over an entire blues or rock progression without
        needing to change as the chords do, which is why so many solos are built from it.
        Nothing in the five notes contradicts any of the chords underneath.`,
      task: `Play the five notes below in any order over a held bass note, then move the
        bass to a different chord of the key and keep playing the same five. Notice what
        does and does not stop working.`,
      example: { kind: 'scale', scaleId: 'minor-pentatonic' },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Major pentatonic or minor pentatonic?`,
        reps: 8,
        asks: 'same-different',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['major-pentatonic', 'minor-pentatonic'] },
        views: ['piano'],
        labelMode: 'none',
        feedback: `Both can contain the same five sounds, so the set will not tell you
          anything. Listen to which note it starts and ends on, and to the size of the
          first step.`,
      },
    },

    review: {
      takeaways: [
        `Major pentatonic is the major scale without degrees 4 and 7.`,
        `Those two form the tritone, so removing them removes every half step.`,
        `Minor pentatonic is the same five sounds with a different note as home.`,
      ],
      next: `Scales give you the notes a key contains. Stacking every other one of them
        gives you chords, which is all of World 3.`,
    },
  },
});

// ---------------------------------------------------------------------------

export const WORLD_2 = defineWorld({
  id: 'world-2',
  number: 2,
  title: 'Scale Forge',
  tagline: 'Build any scale from one pattern',
  blurb: `Ten lessons that replace twelve memorised note lists with one formula and a
    spelling rule. The major scale as a pattern of steps, degrees as a way of talking about
    any key at once, key signatures as the bill that pattern runs up, the three minor
    scales and what each one repairs, the modes heard one note at a time, and the
    pentatonics you get by removing the two notes that cause the arguments.`,
  lessons: [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10],
});

export default WORLD_2;
