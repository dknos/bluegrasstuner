/**
 * WORLD 4 - KEY ROOM
 *
 * Eleven microlessons on what the twelve keys have to do with each other.
 *
 * The spine is one fact, stated in lesson 1 and used for the rest of the world:
 * a key is seven consecutive notes on an unbroken chain of fifths, so moving
 * the key up a fifth slides that window by one and swaps exactly one note. The
 * circle, the order of the sharps, the idea of near and far keys, the pivot
 * chord and the whole shape of a modulation are all that same fact wearing
 * different clothes. Nothing here is a poster to be memorised.
 *
 * The second half is the payoff of the course so far. Diatonic chords are
 * derived by stacking scale tones rather than read off a table, and Roman
 * numerals are presented as what survives transposition, which is the claim
 * worlds 1 to 3 have been quietly building toward.
 *
 * As everywhere else, no example holds notes. Diatonic chords are expressed
 * either as `degrees` recipes (when the point is that they fell out of the
 * scale) or as `chord` recipes with a `rootInterval` (when the point is the
 * chord's name), so the whole world transposes for free.
 */

import { defineLesson, defineWorld } from './schema.js';

/** The twelve tonics musicians actually write, for drills that pick a key. */
const KEY_TONICS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w4-l1-a-fifth-away',
  world: 4,
  index: 1,
  minutes: 5,
  title: 'Neighbours Differ by One Note',
  subtitle: 'Why a key and the key a fifth above it are almost the same key',
  teaches: ['circle-of-fifths'],
  requires: ['perfect-family', 'accidentals'],

  depths: {
    quick: `Move a key up a fifth and six of its seven notes stay exactly where they were; only the fourth degree rises, by a half step.`,

    normal: `Take the seven notes of your key. Go up a fifth and build a major scale from
      there. Six of the notes come back untouched. The one that changes is the fourth
      degree of the key you started in, raised a half step, and in the new key that same
      note is the seventh degree, sitting just under home. Two keys a fifth apart are as
      close as two different keys can get.`,

    deep: `Watch the step pattern do it. A major scale runs whole, whole, half, whole,
      whole, whole, half. Start on the fifth degree of your scale and run up seven of its
      notes and you get whole, whole, half, whole, whole, half, whole, which is nearly
      right and wrong in two places at once: the sixth step is small where it should be
      large, and the last step is large where it should be small. Raising that one note by
      a half step repairs both faults together, because the note sits between them. One
      alteration, two fixes, and the reason there is only ever one is that the two errors
      are neighbours.`,

    nerd: `The clean derivation runs through fifths rather than through steps. Write out
      an unbroken chain of fifths, F C G D A E B F sharp C sharp and onward, and any major
      key is exactly seven consecutive entries on it: C major is F C G D A E B. Move the
      key up a fifth and the window slides one place, dropping F off the bottom and picking
      up F sharp at the top. That is the whole mechanism, and it also tells you what
      distant keys look like. Two keys six fifths apart share exactly one spelled note, and
      keys a half step apart, which feel adjacent on the keyboard, share only two pitches
      out of seven. Nearness on the keyboard and nearness between keys are unrelated
      measurements.`,
  },

  steps: {
    why: {
      text: `Twelve keys is a lot to hold in your head if they are twelve unrelated things.
        They are not unrelated. Some pairs of keys overlap in six notes out of seven, and
        one pair overlaps in two, and knowing which is which turns the whole set into a
        map instead of a list.`,
    },

    hear: {
      text: `Two notes a half step apart. One of them belongs to your key. The other
        belongs to the key a fifth above it, and swapping the first for the second is the
        entire difference between them.`,
      example: { kind: 'stack', intervals: ['P4', 'A4'] },
      playback: 'pair',
    },

    see: {
      text: `Your key's seven notes with the fourth degree raised. That collection is the
        key a fifth up, written out from where you are standing rather than from its own
        tonic, which is why the sharp lands in the middle instead of at the end.`,
      example: { kind: 'scale', scaleId: 'lydian', includeOctave: true },
      views: ['piano', 'staff', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'accidental-lab',
        prompt: `Play your major scale. Now raise the fourth degree by a half step and play
          it again, then start from the fifth degree and run all the way up.`,
        noticing: `Six notes never move. Raised, the fourth degree ends up a half step
          below the fifth degree, which is where a leading tone belongs, and the fifth
          degree quietly starts behaving like home.`,
        views: ['piano', 'staff'],
        labelMode: 'degree',
        controls: ['accidental-step', 'tonic-picker', 'play', 'compare', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Neighbouring keys',
      text: `Two keys whose tonics are a perfect fifth apart. They share six of their seven
        notes, their key signatures differ by exactly one accidental, and the note they
        disagree about is the fourth degree of the lower key and the seventh degree of the
        upper one.`,
      symbol: 'C ↔ G',
      alsoCalled: ['adjacent keys', 'keys a fifth apart', 'the dominant key'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Your key is shown. Move up a fifth. Which single note has to change, and
          what does it become?`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Find the fourth degree of the key you are in and raise it. That note is
          the new key's leading tone, so it always ends up a half step under the new tonic.`,
      },
    },

    apply: {
      text: `This is why a band can slip into the key a fifth up and the change feels like
        a lift rather than a jolt. Almost nothing the players know has to be revised. One
        note gets an accidental and the ear reassigns which note is home.`,
      task: `Play your major scale. Then play the same seven notes starting on the fifth
        degree and stopping on it an octave later. One note near the top will sound wrong.
        Find it, raise it, and play the run again.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 6, 7, 8, 9, 10, 11, 12] },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Two keys. Do they differ by exactly one note, or by more than one?`,
        reps: 8,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Count in fifths, not in half steps. B flat and B natural are neighbours
          on the keyboard and five moves apart as keys.`,
      },
    },

    review: {
      takeaways: [
        `Keys a fifth apart share six notes out of seven.`,
        `The note that changes is the lower key's fourth degree, raised.`,
        `Raised, it becomes the upper key's leading tone, which is what sells the new home.`,
      ],
      next: `Do that move twelve times in a row and something worth drawing happens.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w4-l2-round-the-circle',
  world: 4,
  index: 2,
  minutes: 5,
  title: 'Twelve Moves and You Are Home',
  subtitle: 'The circle of fifths as a distance chart',
  teaches: ['circle-of-fifths'],
  requires: ['perfect-family', 'pitch-class'],

  depths: {
    quick: `Keep going up a fifth and each key changes one more note, until after twelve moves you land back where you began.`,

    normal: `One fifth up costs one sharp. Two fifths up costs two. The move never gets
      more complicated, it just repeats, and after twelve of them you arrive on the note
      you started from. Laying the twelve keys out in that order gives you a chart where
      distance means something specific: neighbours disagree about one note, keys three
      moves apart disagree about three, and keys on opposite sides have almost nothing in
      common.`,

    deep: `Two separate facts make the circle close. The first is arithmetic: twelve fifths
      stacked up cover eighty-four half steps, and seven octaves cover eighty-four half
      steps too, so the twelfth fifth lands on the note you began with. The second is the
      sliding window from the last lesson. Each move drops one note off the flat end of the
      chain of fifths and adds one at the sharp end, so after twelve moves every note has
      been swapped once and the collection is back to its original contents. Read that way,
      the circle is not a picture of the keys. It is a picture of how much they overlap,
      and the number of steps between two keys is the number of notes they argue about.`,

    nerd: `The closure is a rounding error that everyone agreed to live with. Twelve pure
      three-to-two fifths overshoot seven octaves by about twenty-three cents, a gap called
      the Pythagorean comma, so on any tuning that keeps its fifths pure the circle is
      really a spiral that never quite meets. Equal temperament narrows every fifth by
      roughly two cents, the spiral snaps shut, and remote keys stop having distinct
      characters. There is a spelling convention at the bottom of the circle too. Past six
      sharps musicians switch to the flat name, so C sharp major with seven sharps gets
      written as D flat major with five, and F sharp and G flat major sit at the same spot
      with six each. Keys beyond that are legal and almost never used: G sharp major needs
      eight sharps, one of which is an F double sharp.`,
  },

  steps: {
    why: {
      text: `A circle of fifths hangs on the wall of every practice room and almost nobody
        can say what it is for. It is a distance chart, and the distance it measures is how
        many notes two keys disagree about. Once that is clear the picture stops being
        something to memorise.`,
    },

    hear: {
      text: `Your tonic, then a fifth above it, then a fifth above that, then one more.
        Four keys, in the order the circle puts them.`,
      example: { kind: 'stack', intervals: ['P1', 'P5', 'M9', 'M13'] },
      playback: 'sequence',
    },

    see: {
      text: `The same four notes on the pitch ring. Each one is seven positions clockwise
        from the last, which is why walking in fifths visits every pitch before it repeats
        any of them.`,
      example: { kind: 'stack', intervals: ['P1', 'P5', 'M9', 'M13'] },
      views: ['pitchring', 'piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Set a tonic and count the sharps or flats its key needs. Move the tonic up
          a fifth and count again. Keep going until you are back where you started.`,
        noticing: `Every move adds a sharp or removes a flat, never both, never two. Twelve
          moves brings you home, and the halfway point is where the sharp names and the
          flat names describe the same keys.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'name',
        controls: ['tonic-picker', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major' },
      },
    },

    name: {
      term: 'The circle of fifths',
      text: `The twelve keys arranged so that each is a perfect fifth above the one before.
        Clockwise adds sharps, counterclockwise adds flats, and the number of steps between
        any two keys is the number of notes they do not share.`,
      symbol: '♯ clockwise, ♭ counterclockwise',
      alsoCalled: ['cycle of fifths', 'circle of fourths'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `A fifth up from this key lands on which key? Use the name a musician would
          actually write.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['pitchring'],
        labelMode: 'name',
        feedback: `Past six sharps everyone switches to the flat spelling, so the key after
          B is F sharp and the key after that is written D flat rather than C sharp.`,
      },
    },

    apply: {
      text: `Players use the circle to judge how far a key change will travel before they
        write it. A move to a neighbour barely registers. A move to the far side is an
        event, and pieces that go there usually take a few bars to arrive.`,
      task: `Pick a key. Name its two neighbours without counting anything. Then find the
        key directly opposite it on the circle and play both scales back to back, listening
        for how little they have in common.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'order',
        prompt: `Put these keys in order of distance from the key you are in, closest
          first.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['pitchring'],
        labelMode: 'name',
        feedback: `Half steps will mislead you here. D flat is one semitone from C and five
          moves away on the circle, while G is seven semitones away and one move.`,
      },
    },

    review: {
      takeaways: [
        `Each move up a fifth changes one more note.`,
        `Twelve moves return you to the key you started in.`,
        `Steps around the circle count the notes two keys disagree about.`,
        `Past six sharps, the flat name is the one people write.`,
      ],
      next: `The sharps in a key signature arrive in a fixed order. That order is this same
        move, one level down.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w4-l3-signature-order',
  world: 4,
  index: 3,
  minutes: 5,
  title: 'The Sharps Arrive in a Queue',
  subtitle: 'Why key signatures are always written in the same order',
  teaches: ['circle-of-fifths'],
  requires: ['staff', 'accidentals'],

  depths: {
    quick: `Sharps appear in the order F C G D A E B because each new key sharpens the note a fifth above the last one it sharpened.`,

    normal: `Every time a key moves up a fifth, one more note gets a sharp, and it is
      always the note a fifth above the sharp you added last. Start from F. A fifth above F
      is C, then G, then D, then A, then E, then B. Written down, a signature keeps them in
      that order no matter how many it has, so three sharps is always F, C and G. Flats run
      the same list backwards, since going down a fifth is the same move in reverse.`,

    deep: `Here is why the order is a chain of fifths rather than an arbitrary sequence.
      The note that changes when you move up a fifth is the old key's fourth degree, which
      becomes the new key's seventh. Move up another fifth and the note that changes is
      again the seventh degree of the newest key. Everything about the key shifted up a
      fifth, so the note being altered shifted up a fifth too. Sharps therefore climb by
      fifths, and the letters F, C, G, D, A, E, B are the circle of fifths restricted to
      the seven natural letters. Flats do the same thing downward: the note flattened each
      time is the new key's fourth degree, and B, E, A, D, G, C, F descends by fifths.`,

    nerd: `Two shortcuts fall out of this, and both have edges. The last sharp in a
      signature is the leading tone, so the key sits a half step above it, which is how
      four sharps reads as E major. The second-to-last flat names the key outright, so
      three flats reads as E flat major, and that trick fails for one flat because there is
      no second-to-last one; F major has to be learned. Notation has its own conventions
      layered on top. The sharps zig-zag down and up so the whole group stays on the staff,
      which is why the first sharp sits high on the top line in treble clef rather than
      down where you might expect a low F. Common-practice signatures never mix sharps and
      flats, though a fair amount of twentieth-century music does exactly that when the
      scale calls for it.`,
  },

  steps: {
    why: {
      text: `A key signature looks like a random cluster of accidentals until you notice
        that the order never changes, in any key, in any piece, ever. That order was not
        invented by a committee. It falls straight out of the move you learned two lessons
        ago.`,
    },

    hear: {
      text: `The scale of your key, straight up. Whatever sharps or flats you hear in it
        are the ones that get collected at the front of the line instead of being written
        beside each note.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `The same scale on the staff. Each altered letter is altered every single time
        it appears, which is the observation that makes a signature worth having.`,
      example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'letter-wheel',
        prompt: `Start on F and step round the wheel by fifths, saying each letter you land
          on out loud. Stop after seven letters, then reverse and go back.`,
        noticing: `Forwards you get F, C, G, D, A, E, B, and the next step returns you to
          F. That list is the sharp order. Reversed, it is the flat order, and the two are
          the same seven letters read from opposite ends.`,
        views: ['pitchring', 'staff'],
        labelMode: 'name',
        controls: ['letter-slider', 'direction', 'play', 'reset'],
        example: { kind: 'letters' },
      },
    },

    name: {
      term: 'Order of accidentals',
      text: `Sharps are written F, C, G, D, A, E, B. Flats are written B, E, A, D, G, C, F.
        A signature always uses a prefix of one list: three sharps means the first three
        sharps and never any other three.`,
      symbol: '♯ F C G D A E B',
      alsoCalled: ['order of sharps', 'order of flats'],
    },

    practice: {
      drill: {
        kind: 'spell',
        prompt: `This key needs a certain number of sharps or flats. Name them, in order.`,
        reps: 10,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'letter', ids: ['F', 'C', 'G', 'D', 'A', 'E', 'B'] },
        views: ['staff'],
        labelMode: 'name',
        feedback: `You are never choosing which accidentals. You are only choosing how far
          down a fixed list to stop.`,
      },
    },

    apply: {
      text: `Sight-reading depends on this. A signature tells you which letters are altered
        for the rest of the piece, so a player reads the group once and then adjusts every
        occurrence of those letters without thinking about it again.`,
      task: `Look at your key. Say which letters its signature alters, in written order,
        before you play anything. Then play the scale and check that you named exactly the
        notes that needed an accidental.`,
      example: { kind: 'scale', scaleId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Name the major key from its signature, then say which accidental is the
          last one written.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Sharps: go a half step above the last one. Flats: read off the
          second-to-last one. One flat is the exception and has to be memorised.`,
      },
    },

    review: {
      takeaways: [
        `Sharps run F C G D A E B, flats run that list backwards, and a signature always
          takes them from the start.`,
        `The order is the circle of fifths applied to the seven letters.`,
      ],
      next: `Enough about keys as collections. Time to find out what a key gives you to
        play.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w4-l4-chords-from-the-scale',
  world: 4,
  index: 4,
  minutes: 6,
  title: 'Chords Fall Out of the Scale',
  subtitle: 'Every other note, seven times over',
  teaches: ['diatonic-harmony'],
  requires: ['third', 'perfect-family'],

  depths: {
    quick: `Stand on a scale degree, skip a note, take the next, skip again, take the next: three notes of the key, and a chord.`,

    normal: `Build chords out of a key by taking every other note. Stand on the first
      degree, skip the second, take the third, skip the fourth, take the fifth. Those three
      notes are a chord, and all three already belonged to the key, so you made no choices
      and imported nothing. Move up one degree and do it again. Seven degrees, seven
      chords, and the whole set is decided the moment you decide the key.`,

    deep: `Skipping a note is not an arbitrary rule. Two scale notes with one note between
      them are a third apart, and a chord in this system is a stack of thirds, so taking
      every other note is the definition rather than a shortcut. What makes the results
      interesting is that the thirds are not all the same size. A scale contains two sizes
      of step, so some of these thirds enclose four half steps and some enclose three,
      depending on whether one of the scale's two half steps happens to fall inside. Nobody
      decided which. It is forced by where the half steps sit, and it is the reason a
      single key contains chords of more than one kind.`,

    nerd: `The word for chords built this way is diatonic: made from the key's own seven
      notes and nothing else. Underneath, this course builds them exactly as you just did,
      stacking scale tones and then asking which chord formula the result matches, rather
      than consulting a table. That matters more than it sounds. Run the
      same procedure on harmonic minor and it produces an augmented triad on the third
      degree, which no beginner table lists and which is genuinely there, because the
      raised seventh degree puts it there. Keep stacking past three notes and you get
      sevenths, then ninths, elevenths and thirteenths, all from the same operation with
      more floors added. The stack runs out after seven, since the eighth third lands back
      on the note you started from.`,
  },

  steps: {
    why: {
      text: `You can build a major triad and a minor triad from scratch, and nothing so far
        tells you which one belongs where, or which chords sound like they come from the
        same place. A key answers both at once, and it answers them without you making a
        single decision.`,
    },

    hear: {
      text: `Three notes taken from your key, every other one. First separately, then
        together.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `On the staff the three notes stack line, line, line or space, space, space,
        with nothing in between. That picture is what a stack of thirds looks like, and it
        is how you spot a chord written in root position at a glance.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'interval-builder',
        prompt: `Stand on a degree of the scale. Skip a note, take the next, skip again,
          take the next. Then move your starting degree up one and repeat, all the way
          round to the seventh.`,
        noticing: `Every chord uses only notes already in the key, and the shape on the
          page is identical each time. What changes is the number of half steps inside each
          third, and it changes without you touching anything.`,
        views: ['staff', 'piano', 'pitchring'],
        labelMode: 'degree',
        controls: ['letter-slider', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
      },
    },

    name: {
      term: 'Diatonic chords',
      text: `The chords a key builds out of its own seven notes, one standing on each
        degree. Seven notes, seven chords. None of them reaches outside the key.`,
      alsoCalled: ['chords in the key', 'the harmonised scale'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `Place the triad that stands on the degree shown, using only notes from the
          key.`,
        reps: 10,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        feedback: `Do not think about the quality while you build. Take the degree, skip
          one, take the next, skip one, take the next, and read off whatever you got.`,
      },
    },

    apply: {
      text: `This is why a song can use six different chords and still sound like one
        thing. Every chord is drawn from the same seven notes, so the harmony changes
        constantly while the material underneath it never does.`,
      task: `Play the chord on your first degree, then the one on the fourth, then the
        fifth, then back to the first. Check every note you played against the scale. All
        twelve of them are in it.`,
      example: { kind: 'chord', chordId: 'major', rootInterval: 'P4' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Name the chord standing on each degree, root and quality both.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Build it before you name it. The root is the degree you are standing on;
          the quality is whatever the two thirds above it turned out to be.`,
      },
    },

    review: {
      takeaways: [
        `Take every other scale note and you get a chord made only of the key's notes.`,
        `Seven degrees give seven chords, decided entirely by the key.`,
        `The thirds inside them come in two sizes, because the scale's steps do.`,
      ],
      next: `Those two sizes of third produce a pattern of chord qualities, and the pattern
        is identical in all twelve keys.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w4-l5-the-uneven-seven',
  world: 4,
  index: 5,
  minutes: 6,
  title: 'Three Majors, Three Minors, One Oddity',
  subtitle: 'The quality pattern, and the one chord that has to move',
  teaches: ['diatonic-harmony'],
  requires: ['tritone', 'seventh'],

  depths: {
    quick: `Major on degrees 1, 4 and 5, minor on 2, 3 and 6, diminished on 7, and the pattern is identical in every key.`,

    normal: `The seven chords do not come out alike. Three are major, standing on degrees
      1, 4 and 5. Three are minor, on degrees 2, 3 and 6. The one on the seventh degree is
      diminished, which is neither. None of that is decoration. It follows from where the
      scale puts its two half steps, and since every major scale puts them in the same two
      places, the pattern holds in all twelve keys without a single adjustment.`,

    deep: `Do the counting yourself and it stops being a table. A third is minor exactly
      when one of the scale's half steps falls inside it, and the half steps sit between
      degrees 3 and 4 and between degrees 7 and 1. Work through the seven degrees on that
      basis: the lower third comes out large on 1, 4 and 5, small on 2, 3, 6 and 7, and the
      upper third fills in the rest. Degree 7 is the only one that catches a half step in
      both of its thirds at once, which is why it alone comes out diminished. Stack a
      fourth note on each and the same logic hands you exactly one dominant seventh, on the
      fifth degree. Degrees 4 and 7 are the one pair in the key that sits a tritone apart,
      and two of the seven chords catch them both. What separates those two is what sits
      underneath: on degree 5 the tritone arrives as the third and the seventh of a major
      triad, and on degree 7 it is the root and the fifth of a diminished one.`,

    nerd: `The major scale contains precisely one tritone, between its fourth and seventh
      degrees, and that single fact rations the tension in a key. Two of the seven diatonic
      seventh chords contain it: the dominant seventh on degree 5 and the half-diminished
      on degree 7. Among the triads only the diminished chord on degree 7 has it, which is
      why the plain V triad sounds far less urgent than V7. Natural minor is the same seven
      notes started on degree 6, so its qualities are the same list rotated, giving i, ii
      diminished, III, iv, v, VI and VII. The casualty that matters is degree 5, which
      comes out minor. A minor v has no leading tone and no tritone, so it cannot
      close a phrase convincingly, which is the entire reason harmonic minor exists.`,
  },

  steps: {
    why: {
      text: `A key hands you seven chords and they are not seven of the same thing. Three
        are bright, three are dark, one is unstable, and among the four-note versions
        exactly one genuinely has to go somewhere. All of that is forced by the position of
        two half steps.`,
    },

    hear: {
      text: `The four-note chord standing on the fifth degree of your key. Two of its notes
        are six half steps apart, and that gap is the sound of a chord that cannot stay
        where it is.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11] },
      playback: 'chord',
    },

    see: {
      text: `The same chord on the ring. Two of the four notes sit directly opposite each
        other, which you met in World 1 as the interval with no home.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11] },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'tritone-mirror',
        prompt: `Build a four-note chord on each degree of the key in turn and hunt for two
          notes six half steps apart.`,
        noticing: `The tritone shows up on two degrees, the fifth and the seventh, because
          both of those chords contain degrees 4 and 7. Only one of the two is a dominant
          seventh, and there is exactly one per key.`,
        views: ['pitchring', 'staff', 'piano'],
        labelMode: 'interval',
        controls: ['play', 'compare', 'tonic-picker', 'reveal', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11] },
      },
    },

    name: {
      term: 'The diatonic pattern',
      text: `As triads: major, minor, minor, major, major, minor, diminished. As four-note
        chords: major seventh, minor seventh, minor seventh, major seventh, dominant
        seventh, minor seventh, half-diminished. One dominant seventh per key, always on
        the fifth degree.`,
      symbol: 'M m m M M m dim',
      alsoCalled: ['the quality pattern', 'the harmonised major scale'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Which chord stands on the degree shown? Answer before you build it.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: {
          kind: 'chord',
          ids: ['major', 'minor', 'diminished', 'maj7', 'min7', 'dom7', 'half-dim7'],
        },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        feedback: `Memorise the shape of the list rather than seven separate facts: the
          majors bunch at 1, 4 and 5, the minors at 2, 3 and 6, and the odd one is last.`,
      },
    },

    apply: {
      text: `The chord on the fifth degree is why so much music sounds like it is heading
        somewhere. Play the triad and it leans. Add the seventh and the tritone appears,
        and the leaning turns into an obligation.`,
      task: `Play the triad on your fifth degree, then add the note two scale steps above
        its top note and play it again. Listen to how much harder the second version wants
        to fall back to the first degree.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'P5' },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Each claim says a chord belongs to the key shown. Some of them are wrong
          by exactly one note.`,
        reps: 8,
        asks: 'same-different',
        mode: 'visual',
        pool: {
          kind: 'chord',
          ids: ['major', 'minor', 'diminished', 'dom7', 'min7', 'maj7', 'half-dim7'],
        },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Check the chord's notes against the scale one at a time. A major chord
          on degree 2 is a very plausible mistake and always contains a note from outside.`,
      },
    },

    review: {
      takeaways: [
        `Triads: major on 1, 4 and 5; minor on 2, 3 and 6; diminished on 7.`,
        `The pattern is the same in every key because every major scale has the same shape.`,
        `A key contains exactly one tritone, between degrees 4 and 7.`,
        `Only the chord on degree 5 is a dominant seventh, which is why it is the one that
          insists on resolving.`,
      ],
      next: `Seven chords, always the same qualities, always in the same order. That is
        begging to be numbered.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w4-l6-roman-numerals',
  world: 4,
  index: 6,
  minutes: 6,
  title: 'Numbers Instead of Names',
  subtitle: 'Naming a chord by the job it holds',
  teaches: ['roman-numerals'],
  requires: ['diatonic-harmony'],

  depths: {
    quick: `A Roman numeral names a chord by the scale degree it stands on, with capitals for major and lower case for minor.`,

    normal: `Rather than calling a chord by its letter, call it by the degree it sits on.
      First degree is I, second is ii, fifth is V. The case carries the quality: capitals
      for major, lower case for minor, and a small circle after a lower-case numeral for
      diminished. Every major key therefore harmonises as I, ii, iii, IV, V, vi, vii
      diminished, and that line is true in all twelve of them with no changes at all.`,

    deep: `A letter name tells you which notes to press. A numeral tells you what the chord
      is doing in the key it belongs to, and those are different pieces of information. You
      need the second one more often than you would guess. "Go to the four chord" is an
      instruction that works whatever key the band counts in; "go to F" is an instruction
      that works in one key and misleads in eleven. The numeral describes a relationship,
      and relationships are the part of music that survives when everything moves. Which is
      why this notation turns up wherever people have to talk about harmony fast: session
      players, songwriters, arrangers and anyone working something out by ear.`,

    nerd: `The convention has dialects. Some traditions write every numeral in capitals and
      mark the quality separately, so the chord on the second degree becomes II with a
      minor sign rather than ii, and you will meet that in older and in German-language
      analysis. Figured-bass numbers are usually stacked on for inversions, so V6 means a
      dominant triad with its third in the bass and V4 over 3 has its fifth there, while V7
      confusingly means a seventh chord rather than an inversion at all. The Nashville
      number system does the same job with Arabic numerals and a different set of marks,
      because it is quicker to scribble on a set list. None of these systems disagree about
      the music. They disagree about the ink, and you should expect to read all of them.`,
  },

  steps: {
    why: {
      text: `Memorise a chord progression in one key and you have memorised it in one key.
        Describe the same progression as a set of relationships and you have it in twelve,
        which is roughly the difference between learning music and learning a song. Roman
        numerals are the notation for the second thing.`,
    },

    hear: {
      text: `The chord standing on the second degree of your key. It is minor in every key
        there is, and in every key it is called ii.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M2' },
      playback: 'chord',
    },

    see: {
      text: `Here is the same chord written out. The letters underneath it change with the
        key. That number does not, which is exactly the information a numeral is designed
        to keep and a letter name is designed to lose.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M2' },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Step through the seven degrees. For each one, note its number, then note
          whether the chord standing on it came out major, minor or diminished. Now change
          the tonic and do it again.`,
        noticing: `Neither the numbers nor the cases move. Changing the tonic changes only
          the letters, which is precisely the information a numeral leaves out on purpose.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'play', 'label-mode', 'compare', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
      },
    },

    name: {
      term: 'Roman numerals',
      text: `A chord named by its scale degree. Capital for major, lower case for minor, a
        small circle for diminished, a crossed circle for half-diminished, and a 7 added
        when the chord has four notes. In a major key: I, ii, iii, IV, V, vi, vii
        diminished.`,
      symbol: 'I ii iii IV V vi vii°',
      alsoCalled: ['numerals', 'the numbers', 'harmonic analysis'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `You are given a key and a numeral. Place the chord it names.`,
        reps: 10,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        feedback: `Read the numeral in two halves. The number tells you where to stand, and
          the case tells you what you should end up with once you have stacked the thirds.`,
      },
    },

    apply: {
      text: `A chart written in numerals can be handed to a player who has never heard the
        song and read in whatever key the singer wants. That is a working practice, not a
        classroom exercise, and it is most of why the notation exists.`,
      task: `Take the chord below and write it as a numeral in your key. Now move the
        tonic. Keep the numeral, and say what the chord is called now.`,
      example: { kind: 'chord', chordId: 'major', rootInterval: 'P5' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Given a key and a chord, say which degree it stands on and whether its
          numeral is capital or lower case.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: {
          kind: 'chord',
          ids: ['major', 'minor', 'diminished', 'dom7', 'min7', 'maj7', 'half-dim7'],
        },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `Locate the root in the scale first and count up from the tonic. The
          quality then decides the case, and a chord whose root is not in the scale has no
          plain numeral at all.`,
      },
    },

    review: {
      takeaways: [
        `The numeral is the degree; the case is the quality.`,
        `Every major key harmonises as I, ii, iii, IV, V, vi, vii diminished.`,
        `Several notations do this job, and they disagree only about symbols.`,
      ],
      next: `Now the reason any of this was worth building: numerals do not care what key
        you are in.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w4-l7-numerals-travel',
  world: 4,
  index: 7,
  minutes: 6,
  title: 'The Same Song Somewhere Else',
  subtitle: 'What survives when a progression changes key',
  teaches: ['roman-numerals'],
  requires: ['diatonic-harmony', 'interval'],

  depths: {
    quick: `Write a progression as numerals and it stops belonging to any one key: move the tonic and every chord follows on its own.`,

    normal: `I, vi, IV, V in C major is C, Am, F, G. The same four numerals in E major are
      E, C sharp minor, A, B. Different letters, four extra sharps, and musically the same
      thing happening. A band that knows the numerals can lift a song a whole step between
      one chorus and the next without anybody relearning a part, because nothing about the
      song was ever stored as letters.`,

    deep: `This is the claim the last three worlds were assembling. An interval survives
      transposition because it is a distance rather than a pitch. A scale survives because
      it is a pattern of intervals. A chord survives because it is a stack of intervals,
      and a progression survives because it is a set of chords defined by where they stand
      in a scale. What a numeral adds is the notation that makes all that survival visible
      on the page. Nothing is being converted when you change key. The music was stored as relationships
      the whole time, and the letters were one rendering of it.`,

    nerd: `Plenty does fail to transpose, and pretending otherwise causes real problems.
      Register does: a progression sitting comfortably under the hands can end up
      unplayably low, and a melody that fitted a singer in one key will strand them in
      another, which is the usual reason a key gets changed in the first place. Instrument
      idiom does too. Guitarists capo rather than transpose because open strings are part
      of the sound, and clarinet and trumpet parts are written in a different key from the
      score so the fingerings stay where the player learned them. Historically there is one
      more wrinkle: on unequal temperaments the keys really did sound different from each
      other, which is where old writing about key character comes from. Equal temperament
      removed that difference, and what is left is register, timbre and habit.`,
  },

  steps: {
    why: {
      text: `Everything up to this point has been building one claim: music is stored as
        relationships rather than as pitches. This is where the claim pays out, because a
        progression written in numerals can be dropped into any of the twelve keys without
        a single decision being taken.`,
    },

    hear: {
      text: `The roots of four chords in order: first degree, sixth, fourth, fifth. You have
        heard this shape a few thousand times. Nobody ever told you its name.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 4, 5] },
      playback: 'sequence',
    },

    see: {
      text: `The same four roots on the staff and the ring. Change the key and the
        noteheads all move together, keeping the distances between them intact.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 4, 5] },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'staff-plotter',
        prompt: `Plot the four chord roots on the staff. Change the key and plot them
          again. Do it once more in a key with the opposite accidentals.`,
        noticing: `The noteheads move, the accidentals change and the signature changes.
          The numbers underneath never do, and neither does the shape the noteheads make.`,
        views: ['staff', 'piano'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'clef-switch', 'play', 'compare', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 4, 5] },
      },
    },

    name: {
      term: 'Transposing a progression',
      text: `Moving harmony to a new key by keeping the numerals and changing the tonic.
        Every root moves by the same interval, every quality stays put, and the analysis
        you wrote for the old key is still correct in the new one.`,
      symbol: 'I vi IV V',
      alsoCalled: ['changing key', 'a numbers chart'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Two progressions in two different keys. Are they the same set of numerals
          or not?`,
        reps: 10,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Convert both to numerals before comparing. Two progressions that share
          no letters at all can be identical, and two that share three letters can differ.`,
      },
    },

    apply: {
      text: `Singers ask for this constantly, and the request is always the same one: keep
        the song, move the range. A player who thinks in numerals says yes in about a
        second.`,
      task: `Play a four-chord progression in your key. Move the tonic up a fourth and play
        the same four numerals. The last chord should still feel like the same kind of
        arrival, in a place your voice can reach.`,
      example: { kind: 'chord', chordId: 'major', rootInterval: 'P4' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Here is a progression in one key. Build the same progression in the key
          named.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'dom7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Work through the numerals rather than transposing note by note. Note by
          note is slower and it gets the spellings wrong in the flat keys.`,
      },
    },

    review: {
      takeaways: [
        `A progression written in numerals belongs to no particular key.`,
        `Transposing means keeping the numerals and moving the tonic.`,
        `Register, instrument idiom and playability do not transpose, which is usually why
          the key was being changed.`,
        `This is the same reason a melody survives being sung higher, one layer up.`,
      ],
      next: `Two keys can share every note and still disagree about where home is.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w4-l8-relative-keys',
  world: 4,
  index: 8,
  minutes: 5,
  title: 'Same Notes, Different Home',
  subtitle: 'Relative major and relative minor',
  teaches: ['relative-keys'],
  requires: ['circle-of-fifths', 'sixth'],

  depths: {
    quick: `Every major key shares all seven of its notes with a minor key whose home is the sixth degree.`,

    normal: `Start on the sixth degree of a major scale and run up seven notes without
      altering any of them. What comes out is a natural minor scale, built from the
      identical collection you began with. Nothing was added. The two keys share a key
      signature, so on the page there is nothing at all to tell them apart, and what
      separates them is which note the music keeps treating as home.`,

    deep: `A key is a collection of notes plus a centre, and the relative pair is the proof
      that the centre does most of the work. Nothing in the seven notes says which of them
      is home. The music decides it, by which chord phrases land on, which note the bass
      keeps returning to, and which of the two candidate leading tones gets used. Shift the
      emphasis and the same seven notes turn from bright to dark without one accidental
      appearing anywhere. It also explains why the relative minor is the easiest place in
      the world to modulate to. There is nothing to change except the listener's mind.`,

    nerd: `The pairing is exact for natural minor and slightly untrue in practice, because
      most minor-key music raises the seventh degree to get itself a leading tone, and that
      accidental is written into the bars rather than the signature. So a piece in A minor
      is littered with G sharps that its signature never mentions, and an empty signature in
      a minor piece really means "A minor, plus whatever the seventh degree is up to today".
      Geometrically the relative minor sits a major sixth above the major tonic, or a minor
      third below, and both keys occupy the same position on the circle of fifths. Spelling
      gets awkward at the edges: the relative minor of G flat major is E flat minor, which is
      six flats and fine, while the relative minor of C flat major is A flat minor and is
      usually respelled rather than printed.`,
  },

  steps: {
    why: {
      text: `Two keys can have the same signature, the same seven notes and completely
        different characters, with nothing whatsoever on the page to distinguish them.
        Working out how that is possible is what turns a key from a list of notes into
        something with a centre.`,
    },

    hear: {
      text: `Your key's seven notes played from the sixth degree upward. Not one of them
        was altered. It sounds minor regardless.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [6, 7, 8, 9, 10, 11, 12, 13] },
      playback: 'sequence',
    },

    see: {
      text: `The same run on the staff. No new accidental appeared, because none was needed;
        the signature that fits your major key fits this scale exactly.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [6, 7, 8, 9, 10, 11, 12, 13] },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Walk up your major scale from the tonic and back down. Then walk the same
          notes starting from the sixth degree, and stop on the note you started from.`,
        noticing: `Neither walk alters anything. Starting on degree 6 puts the two half
          steps in different places relative to home, and that repositioning is the entire
          difference between major and minor.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'direction', 'play', 'compare', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Relative keys',
      text: `A major key and the minor key built from the same seven notes. The relative
        minor's tonic is the sixth degree of the major scale, a major sixth above it or a
        minor third below. Both keys share a signature and sit at the same point on the
        circle.`,
      symbol: 'C ↔ Am',
      alsoCalled: ['relative minor', 'relative major'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Name the relative minor of the major key shown.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'pitchring'],
        labelMode: 'name',
        feedback: `Count up six letters or down three. Down three is faster and lands on
          the same note, since the two routes differ only by an octave.`,
      },
    },

    apply: {
      text: `Songwriters move between a relative pair without preparing anything, because
        there is nothing to prepare. A verse centred on the sixth degree and a chorus
        centred on the first can use one set of chords throughout.`,
      task: `Play the chords on degrees 1, 4 and 5 and let each phrase end on the first.
        Then play the chords on degrees 6, 2 and 3 and end each phrase on the sixth. Six
        chords, one key signature, two homes.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M6' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `One signature, two candidate keys. Given the chord the music ends on, say
          which key it is in.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'piano'],
        labelMode: 'none',
        feedback: `The signature never answers this. The final chord usually does, and a
          raised seventh degree appearing as an accidental is a strong hint that the minor
          is the real home.`,
      },
    },

    review: {
      takeaways: [
        `A major key and its relative minor share all seven notes and one signature.`,
        `The relative minor's tonic is the major scale's sixth degree.`,
        `Emphasis decides which of the two is home, and nothing on the page does.`,
      ],
      next: `There is a second pairing that does the opposite: same home, different notes.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w4-l9-parallel-keys',
  world: 4,
  index: 9,
  minutes: 4,
  title: 'Same Home, Different Notes',
  subtitle: 'Parallel major and parallel minor',
  teaches: ['relative-keys'],
  requires: ['circle-of-fifths', 'third'],

  depths: {
    quick: `Parallel keys keep the tonic and swap the mode, which costs three notes: the third, sixth and seventh each drop a half step.`,

    normal: `A relative pair shares its notes and disagrees about home. Parallel keys do the
      reverse. Home stays exactly where it was and the notes change: going from a major key
      to the minor key on the same tonic lowers the third, the sixth and the seventh by a
      half step each. On paper that is a jump of three positions toward the flat side of the
      circle, which looks drastic and does not sound it, because the note you keep calling
      home never moved.`,

    deep: `Composers swap between a parallel pair mid-phrase, and they get away with it
      because the tonic is the thing a listener is holding on to and the tonic is precisely
      what survives. Lower the third of a major chord and you have the minor chord on the
      same root: the harmony darkened without travelling anywhere. Borrowing one chord from
      the parallel key is among the most common colour moves in popular music, and the ear
      files it as a shading of the current key rather than a change of key. Relative keys
      look identical on the page and sound different. Parallel keys look different and share
      a centre.`,

    nerd: `The three-position distance is exact and worth checking once. C major has no
      accidentals, C minor has three flats, and three moves counterclockwise from C lands on
      E flat major, whose relative minor is C minor. Follow that logic into remote keys and
      it gets ugly. The parallel minor of G flat major is G flat minor, which needs nine
      flats including double flats, so scores print F sharp minor instead and the piece
      changes its spelling in the middle. Ask the theory engine here for G flat natural
      minor and it will hand you the double flats without blinking, because that is the
      honest answer, and no publisher would set it. One vocabulary warning as well: several European
      traditions use their word for "parallel" to mean what English calls the relative key,
      so translated theory books can say the exact opposite of what you expect.`,
  },

  steps: {
    why: {
      text: `Relative keys share their notes and argue about home. A second pairing does
        precisely the reverse, and knowing both is what lets you lift a chord out of one and
        drop it into the other without the music falling over.`,
    },

    hear: {
      text: `The minor scale built on your own tonic. Home has not shifted by a hair. Three
        of the seven notes have.`,
      example: { kind: 'scale', scaleId: 'aeolian', includeOctave: true },
      playback: 'sequence',
    },

    see: {
      text: `The same scale written out. Three degrees carry an accidental and the first
        degree is untouched, which is the visual signature of a parallel pair.`,
      example: { kind: 'scale', scaleId: 'aeolian', includeOctave: true },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'quality-shifter',
        prompt: `Play your major scale. Lower the third, then the sixth, then the seventh,
          one at a time, and listen after each change.`,
        noticing: `The third does most of the work on its own. Lowering the sixth and
          seventh deepens what the third started, and at no point does the note you hear as
          home go anywhere.`,
        views: ['staff', 'piano', 'pitchring'],
        labelMode: 'degree',
        controls: ['accidental-step', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Parallel keys',
      text: `A major key and the minor key on the same tonic. They share a home note and
        differ by three degrees, and their signatures sit three steps apart on the circle of
        fifths.`,
      symbol: 'C / Cm',
      alsoCalled: ['parallel major', 'parallel minor', 'the variant key'],
    },

    practice: {
      drill: {
        kind: 'spell',
        prompt: `Which three notes change when this major key becomes its parallel minor?
          Spell them.`,
        reps: 10,
        asks: 'spelling',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        feedback: `Always degrees 3, 6 and 7, each lowered a half step. In sharp keys the
          lowering often cancels a sharp rather than adding a flat.`,
      },
    },

    apply: {
      text: `Taking a chord from the parallel key is called borrowing, and World 5 does it
        properly. What matters here is that borrowing works because the two keys agree about
        the tonic, so the borrowed chord sounds coloured rather than foreign.`,
      task: `Play the chord on your fourth degree, then lower its third by a half step and
        play it again inside the same phrase. Nothing about the key changed. The light did.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'P4' },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Each pair of keys is described as relative or parallel. Catch the ones that
          have it backwards.`,
        reps: 8,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'scale', ids: ['major', 'aeolian', 'harmonic-minor'] },
        views: ['staff', 'pitchring'],
        labelMode: 'name',
        feedback: `Relative pairs share a signature and differ in tonic. Parallel pairs
          share a tonic and differ by three accidentals.`,
      },
    },

    review: {
      takeaways: [
        `Parallel keys share a tonic and differ in degrees 3, 6 and 7.`,
        `Their signatures are three steps apart on the circle, which is further than it
          sounds.`,
      ],
      next: `Both pairings are places a piece can go. Next, what it feels like to actually
        go there.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L10 = defineLesson({
  id: 'w4-l10-changing-key',
  world: 4,
  index: 10,
  minutes: 7,
  title: 'When Home Moves',
  subtitle: 'What a change of key actually is',
  teaches: ['modulation'],
  requires: ['relative-keys', 'circle-of-fifths'],

  depths: {
    quick: `Modulation is the music deciding that a different note is home, and you notice it when the old tonic stops sounding restful.`,

    normal: `A piece does not have to stay in one key. When it changes, what changes is
      which note feels like home, and the way that happens is by insistence: new accidentals
      turn up, phrases start landing on the new tonic, and after a while the old home begins
      to sound like a departure instead of an arrival. Distance decides how it feels. One
      step round the circle is a change of light. The far side is an event, and pieces
      normally take their time getting there.`,

    deep: `Your ear tracks a tonic by keeping score. A note earns the job by being arrived
      at, by being what phrases finish on, and by having a leading tone underneath it
      pulling up. Modulation works by moving all three kinds of evidence onto a new note,
      and it stops sounding like a wrong note and starts sounding like a new key at the
      moment the evidence tips over. Which is also why one borrowed accidental is not a
      modulation: a single chord from elsewhere reads as colour, because nothing else about
      the scoring moved. The threshold is genuinely blurry, and analysts argue about where a
      passage stopped visiting and started living somewhere. That argument is a property of
      the music rather than a hole in the theory.`,

    nerd: `The keys a piece can reach without much ceremony are the ones whose signatures
      differ from the current key by a single accidental, plus the relative minor: the
      dominant, the subdominant, the relative minor, and the relative minors of the dominant
      and subdominant. Five destinations, and classical practice modulates to the dominant so
      routinely that the whole first section of a sonata form is built around going there
      and the whole last section around not needing to. At the other extreme sits the
      modulation nobody bothers to analyse, the direct shove up a half step in a final
      chorus, which works precisely because it has no preparation and the jolt is the point.
      Listeners with absolute pitch experience all of this differently, hearing the new key
      by name rather than by feel, which is one of the few situations where absolute pitch
      gets in the way.`,
  },

  steps: {
    why: {
      text: `A three-minute song can begin in one key and end in another without anybody
        hearing a join. Nothing physical moved; the notes are still notes and the instrument
        is still tuned the same way. The thing that moved is where your ear puts the
        centre.`,
    },

    hear: {
      text: `One chord, and one note in it does not belong to your key. That note is the
        leading tone of the key a fifth up, and this chord is the commonest way music
        announces it is leaving.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'M2' },
      playback: 'chord',
    },

    see: {
      text: `The raised fourth degree is the visible sign. On the staff it appears as an
        accidental inside the bar rather than in the signature, because the piece has not
        committed yet.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'M2' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Set the tonic, then move it up a fifth and look at what happened to the
          numbers underneath the notes you were already looking at.`,
        noticing: `Almost nothing had to move for the numbers to change completely. What was
          degree 5 is now degree 1, what was degree 1 is now degree 4, and the note that
          used to be degree 4 is the one thing that had to be altered.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Modulation',
      text: `A change of key inside a piece, established rather than announced: accidentals
        from the new key, cadences onto the new tonic, and enough time for the ear to accept
        it. Borrow another key's dominant, come straight back, and what you did was a
        tonicisation instead.`,
      alsoCalled: ['key change', 'changing key'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Which of these keys is one accidental away from the key shown?`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['pitchring', 'staff'],
        labelMode: 'name',
        feedback: `A fifth up and a fifth down are both one accidental away. Nothing else is
          that close. Thirds and half steps look near and are not.`,
      },
    },

    apply: {
      text: `Moving to the dominant is the standard move in classical music and a common one
        everywhere else, because it costs a single accidental and that accidental is a ready
        made leading tone.`,
      task: `Play the chords on degrees 1, 4 and 5 of your key. Now raise the fourth degree
        everywhere and play the same three shapes counted from the fifth degree instead.
        Notice how fast the fifth degree starts behaving like home.`,
      example: { kind: 'scale', scaleId: 'lydian', includeOctave: true },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Two keys are named. Say how many accidentals separate them and whether the
          move between them counts as close.`,
        reps: 8,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'spelling', ids: KEY_TONICS },
        views: ['pitchring'],
        labelMode: 'name',
        feedback: `Compare signatures rather than tonics. Two keys whose tonics are a half
          step apart are five or seven moves away from each other.`,
      },
    },

    review: {
      takeaways: [
        `Modulation moves the tonic, which means it moves the ear rather than the notes.`,
        `Evidence for a new home is arrival, cadence and a leading tone.`,
        `Close keys differ by one accidental; the far side of the circle takes preparation.`,
      ],
      next: `The mechanism that makes a good modulation invisible is a single chord with two
        legitimate names.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L11 = defineLesson({
  id: 'w4-l11-pivot-chords',
  world: 4,
  index: 11,
  minutes: 6,
  title: 'The Chord That Belongs to Both',
  subtitle: 'Pivots, and why a good key change has no seam',
  teaches: ['modulation'],
  requires: ['roman-numerals', 'relative-keys'],

  depths: {
    quick: `A pivot chord has a legitimate numeral in both keys, so the music can be reinterpreted mid-chord and the join disappears.`,

    normal: `Neighbouring keys share six of their seven notes, so they share most of their
      chords too. Pick one of the shared ones, arrive on it as a chord of the key you are
      in, then leave it as a chord of the key you are going to by following it with the new
      key's dominant. Nothing sounds wrong at any point, because the chord itself never had
      to pick a side.`,

    deep: `Work out which chords are available and the technique becomes obvious. Going up a
      fifth, the only note that changes is your fourth degree, so any chord that avoids that
      note belongs to both keys. In a major key that leaves the chords standing on degrees
      1, 3, 5 and 6, and each of them has two names: the chord on degree 1 is also IV in the
      new key, and the chord on degree 6 is also ii there. The pivot people reach for most
      is the one that becomes the new ii or the new IV, since both lead straight into the
      new dominant, and the dominant is what actually does the persuading. Note that a pivot
      is only a pivot in hindsight. It sounded like a chord of the old key while it was
      playing, and it becomes a chord of the new one because of what follows it.`,

    nerd: `Analysts write a pivot as two numerals stacked, the old key's above the new key's,
      with both key names on the left. Where exactly to place it is genuinely disputed: some
      put the pivot on the last chord that still makes sense in the old key, others on the
      first that makes sense in the new one, and for a chord that works in both the music
      does not care which you choose. Other mechanisms exist and are worth recognising. A
      common-tone modulation holds a single note and rebuilds a new key around it. An
      enharmonic modulation respells a chord so it means something different, most often a
      diminished seventh or an augmented sixth, which is where the double accidentals from
      World 0 finally earn their keep, since one keyboard sound legitimately carries two
      names with two destinations. And a direct modulation simply changes, with no
      preparation at all, and dares the listener to object.`,
  },

  steps: {
    why: {
      text: `A key change that lands badly sounds like a mistake, and one that is done well
        is invisible until you go looking for the seam. The difference is usually a single
        chord: the one that had an honest name in both keys at once.`,
    },

    hear: {
      text: `The chord on your sixth degree. In this key it is vi. In the key a fifth up it
        is ii, and it contains nothing that would give either reading away.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M6' },
      playback: 'chord',
    },

    see: {
      text: `Look at what the chord avoids. Your fourth degree is the only note the two keys
        disagree about, and this chord does not contain it, which is the whole qualification
        for the job.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M6' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Build all seven triads of your key. Find the three that contain the fourth
          degree and set them aside.`,
        noticing: `Four chords are left standing, on degrees 1, 3, 5 and 6, and every one of
          them belongs just as honestly to the key a fifth up. Those four are your pivots,
          and you found them by elimination rather than by memory.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [6, 8, 10] },
      },
    },

    name: {
      term: 'Pivot chord',
      text: `A chord that is diatonic in both the old key and the new one, used as the hinge
        of a modulation. It is heard in the old key, understood in the new one, and the
        reinterpretation is confirmed by whatever follows it.`,
      symbol: 'vi = ii',
      alsoCalled: ['common chord', 'the hinge'],
    },

    practice: {
      drill: {
        kind: 'true-false',
        prompt: `A chord and two keys. Does it belong to both of them?`,
        reps: 10,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        feedback: `Check the chord's three notes against both scales. One note from outside
          either key disqualifies it, however comfortable the chord sounds.`,
      },
    },

    apply: {
      text: `Written out, a modulation to the dominant is four chords long. Home, pivot, new
        dominant, new home. Most classical key changes are that shape with more music
        wrapped around it.`,
      task: `Play the chord on your first degree, then the chord on your sixth. Now play the
        dominant seventh of the key a fifth up, then that key's tonic chord. The sixth-degree
        chord was the pivot. It never sounded like a departure.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'M2' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Build a pivot from the key shown into the key a fifth above it, then build
          the chord that has to follow it.`,
        reps: 8,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'dom7'] },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        feedback: `The chord that has to follow is always the new key's dominant, because
          that is the chord carrying the new leading tone. Without it the pivot is just a
          chord you played.`,
      },
    },

    review: {
      takeaways: [
        `A pivot chord is diatonic in both keys and gets a numeral in each.`,
        `Going up a fifth, the pivots are the chords on degrees 1, 3, 5 and 6.`,
        `The new key's dominant is what confirms the change; the pivot only makes it
          painless.`,
      ],
      next: `You can now name every chord a key contains and move between keys on purpose.
        World 5 asks what those chords are for.`,
    },
  },
});

// ---------------------------------------------------------------------------

export const WORLD_4 = defineWorld({
  id: 'world-4',
  number: 4,
  title: 'Key Room',
  tagline: 'Twelve keys, one map',
  blurb: `Eleven lessons on what the twelve keys have to do with each other. Keys a fifth
    apart differ by exactly one note, and that single fact generates the circle, the order
    of the sharps and the whole idea of near and far. Then the chords a key hands you for
    free, the numerals that name them by job rather than by letter, and what it takes to
    move house.`,
  lessons: [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11],
});

export default WORLD_4;
