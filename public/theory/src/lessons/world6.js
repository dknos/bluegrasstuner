/**
 * WORLD 6 - OPEN EAR
 *
 * Nine microlessons that take everything from the first six worlds and remove
 * the picture. The theory does not change here. What changes is the route: a
 * sound arrives, you commit to a name, and only then does anything appear on
 * screen.
 *
 * Two authoring rules follow from that.
 *
 *   - Every `discover` widget is configured with labelMode 'none' and a
 *     `reveal` control, so the notation is genuinely hidden until the learner
 *     has answered. A widget that shows the answer while you are guessing is a
 *     demonstration, not a drill.
 *   - The ear drills carry no `views` at all. The schema allows it, and it
 *     encodes "without looking" more honestly than a label mode does.
 *
 * The world is also deliberately blunt about how slow this is. Ear training is
 * the one part of the course where reading the page a second time does nothing,
 * and pretending otherwise sets learners up to quit in week three.
 *
 * As everywhere else, no example holds notes. Every one is a recipe.
 */

import { defineLesson, defineWorld } from './schema.js';

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w6-l1-ten-minutes',
  world: 6,
  index: 1,
  minutes: 4,
  title: 'Short and Often',
  subtitle: 'How this kind of practice actually works',
  teaches: ['interval-ear'],
  requires: ['interval-inversion', 'tritone', 'melodic-harmonic'],

  depths: {
    quick: `Ear training runs on short daily sessions over a small set of sounds, and it is slower than anything else in this course.`,

    normal: `Ten focused minutes a day beats an hour once a week. It also beats two hours of
      half-listening, by more than most people expect. The difference is what you are
      building: a reflex rather than a fact. Facts arrive in one sitting. Reflexes need
      short repeated exposure with sleep in between, and the gap between sessions is doing
      as much work as the sessions are. Keep your pool of sounds small enough that you are
      right most of the time.`,

    deep: `Two habits separate practice that works from practice that feels like work. The
      first is committing out loud. Say a name before anything is revealed, even when you
      are sure you are wrong, because the moment of retrieval is where the learning
      happens and a silent shrug skips it entirely. The second is keeping the pool small.
      If you are getting four in five right, the pool is the right size; if you are at
      half, you are guessing and reinforcing nothing. Add one new sound at a time, and add
      it only when the current set feels boring. Boredom is the signal you are waiting
      for.`,

    nerd: `Progress here is genuinely non-linear and the plateaus are long, which is worth
      knowing before you hit one. A few things make the picture messier than a tidy
      curriculum suggests. Recognising an interval in isolation and recognising it inside
      a piece of music are partly separate abilities, so people who ace a drill app can
      still stall on real recordings, and the reverse happens too. Timbre matters more than
      it should: a set trained entirely on piano transfers imperfectly to voice or strings.
      Absolute pitch is a different faculty again, and the research on whether adults can
      acquire it is contested and mostly discouraging, which is not a problem because
      relative pitch is the one that does the musical work. None of this is a reason to
      skip the reps. It is a reason not to read a bad week as failure.`,
  },

  steps: {
    why: {
      text: `Everything so far has been available to look at. The keyboard sat in front of
        you, the staff was on the page, and the name of the interval was one label away.
        Take those away and most people discover they can barely name a fifth. That gap is
        normal, and it closes with a particular kind of practice rather than with more
        reading.`,
    },

    hear: {
      text: `Two notes. Listen twice before you do anything else, and notice whether the
        sound is already familiar from somewhere.`,
      example: { kind: 'interval', intervalId: 'P5' },
      playback: 'pair',
    },

    see: {
      text: `Now look at it. This is the step you earn by answering first, and for the rest
        of the world the picture arrives after your guess rather than before it.`,
      example: { kind: 'interval', intervalId: 'P5' },
      views: ['piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'interval-ear',
        prompt: `Play the pair, sing it back out loud, say a name, then reveal. Ten rounds,
          and do not skip the singing on the ones you are sure about.`,
        noticing: `Saying the answer out loud before the reveal is uncomfortable and it is
          the part that works. Thinking "probably a fifth" while the answer appears on its
          own teaches you close to nothing.`,
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        controls: ['play', 'reveal', 'tonic-picker', 'reset'],
        example: { kind: 'interval', intervalId: 'P5' },
      },
    },

    name: {
      term: 'Ear training',
      text: `Building a reflex that turns a sound straight into a name, with no keyboard in
        between. The method you will use for the rest of this world has three parts: a
        small pool of sounds, an answer committed out loud, and a short session repeated
        tomorrow.`,
      alsoCalled: ['aural skills', 'listening practice'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Fifth or octave. Say it out loud before you tap.`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['P5', 'P8'] },
        feedback: `Two sounds is a deliberately easy pool. Scoring near the top of it is
          the signal that the pool is ready to grow, not a sign the drill is beneath you.`,
      },
    },

    apply: {
      text: `Most people already own a few intervals without realising it, borrowed from
        songs they have heard thousands of times. A reference tune is a crutch worth using,
        as long as you eventually stop needing it. Pick your own rather than inheriting
        somebody else's list, because the songs you actually know by heart are the ones
        that will still be there under pressure.`,
      task: `Find a song in your head that opens with a leap. Play its first two notes,
        name the interval, and note the title beside it. Two references is enough to start
        with.`,
      example: { kind: 'interval', intervalId: 'P4' },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Three options now. The fourth and the fifth are the pair that will catch
          you.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'melodic-up',
        difficulty: 2,
        pool: { kind: 'interval', ids: ['P4', 'P5', 'P8'] },
        feedback: `When a fourth keeps coming out as a fifth, sing the octave above the
          lower note and ask whether your target sat nearer the bottom or the top.`,
      },
    },

    review: {
      takeaways: [
        `Ten focused minutes beats an hour of drifting, and beats it again tomorrow.`,
        `Commit to an answer out loud before anything is revealed.`,
        `Keep the pool small enough that you are mostly right.`,
      ],
      next: `A pool of three is a starting position. Next, the rest of the intervals, added
        one at a time.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w6-l2-intervals-blind',
  world: 6,
  index: 2,
  minutes: 6,
  title: 'Naming the Gap With Your Eyes Shut',
  subtitle: 'Every simple interval, by anchoring rather than counting',
  teaches: ['interval-ear'],
  requires: ['interval-ear', 'third', 'sixth', 'seventh'],

  depths: {
    quick: `Anchor on a few intervals you already know cold, then judge every new one as being wider or narrower than an anchor.`,

    normal: `Counting half steps does not survive contact with real listening. Nobody hears
      nine and decides it is a major sixth. What works instead is anchoring: you learn three
      or four intervals so thoroughly that they are instant, and you place everything else
      relative to them. The octave, the fifth and the major third make a good starting set,
      because they are far apart in size and none of them sounds like the others.`,

    deep: `Inversion cuts the job roughly in half, which is the practical payoff of that
      lesson back in World 1. If you can hear a minor third reliably, you can hear a major
      sixth, because the major sixth is the same two notes with the lower one moved up an
      octave. Wide intervals are hard partly because there is more room for your attention
      to wander between the notes, so flipping the interval in your head and judging the
      narrow version is a real technique rather than a shortcut. Descending intervals
      deserve their own reps too. A descending minor sixth does not feel like an ascending
      one played backwards, and people who train only upward find their accuracy collapses
      the first time a melody goes down.`,

    nerd: `The tritone is the one interval that most people get for free, because it sounds
      like nothing else and there is no neighbour to confuse it with. Everything either side
      of it is harder. The pairs that cause the most trouble are the ones a half step apart
      at the wide end: major sixth against minor seventh, and minor seventh against major
      seventh. Two things help. Anchor downward from the octave rather than upward from the
      root, since near the top of the octave you are judging a small remainder instead of a
      large span. And be aware that equal temperament flattens some of the character you
      might be listening for: a major third on a piano is noticeably wider than the pure 5:4
      that a choir will sing, so an interval learned on one and tested on the other can feel
      subtly wrong even when you are right.`,
  },

  steps: {
    why: {
      text: `A pool of three intervals runs out of usefulness quickly. Growing it is where
        most people stall, because the obvious method is to count half steps and counting
        is far too slow to happen in real time. There is a different method, and it uses a
        symmetry you have already met.`,
    },

    hear: {
      text: `A starting note, then a minor third, then a major third. One half step apart,
        and they are the pair that decides whether almost anything sounds bright or dark.`,
      example: { kind: 'stack', intervals: ['P1', 'm3', 'M3'] },
      playback: 'sequence',
    },

    see: {
      text: `The two thirds side by side, after the fact. Notice how small the visual
        difference is compared with how different they sound.`,
      example: { kind: 'stack', intervals: ['P1', 'm3', 'M3'] },
      views: ['piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'interval-ear',
        prompt: `Play a random interval with the labels off. Guess. Then invert it and
          guess again before you reveal either answer.`,
        noticing: `The narrow version is usually the easier guess, and the numbers add to
          nine, so a confident answer on one end gives you the other end free. Flipping a
          hard interval into an easy one is faster than counting it.`,
        views: ['pitchring', 'piano'],
        labelMode: 'none',
        controls: ['play', 'reveal', 'invert', 'direction', 'reset'],
        example: { kind: 'ladder' },
      },
    },

    name: {
      term: 'Anchoring',
      text: `Judging an unknown interval against a small set you know instantly, instead of
        measuring it from scratch. Your anchors are personal. Whatever three or four
        intervals you can name without hesitating are the right ones to build on, and the
        set grows as those become automatic.`,
      alsoCalled: ['reference intervals', 'landmark intervals'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Minor third, major third or perfect fifth.`,
        reps: 10,
        asks: 'interval-name',
        mode: 'melodic-up',
        pool: { kind: 'interval', ids: ['m3', 'M3', 'P5'] },
        feedback: `The fifth is the odd one out and should be the first thing you rule in
          or out. That leaves a single question: bright or dark.`,
      },
    },

    apply: {
      text: `Anchoring is what lets you work out an unfamiliar melody without a keyboard.
        You place the first leap against something you know, then measure each following
        note from the one before it. Being slightly wrong and correcting is normal, and it
        is faster than refusing to guess.`,
      task: `Play a note, sing a minor sixth above it without checking, then play the note
        you meant. If you are out, you are probably out by a half step, and hearing which
        direction is the useful part.`,
      example: { kind: 'interval', intervalId: 'm6' },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Wide intervals, descending. Flip them in your head if that helps.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'melodic-down',
        difficulty: 4,
        pool: { kind: 'interval', ids: ['m6', 'M6', 'm7', 'M7', 'P8'] },
        feedback: `Count down from the octave rather than up from the bottom. A major
          seventh leaves a half step, a minor seventh leaves a whole step, and a major
          sixth leaves a step and a half.`,
      },
    },

    review: {
      takeaways: [
        `Anchor on a few intervals you know cold and place everything else against them.`,
        `Invert a wide interval and judge the narrow version instead.`,
        `Train descending intervals separately. They do not come free with ascending.`,
      ],
      next: `Intervals in isolation are a laboratory condition. Melodies behave differently.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w6-l3-intervals-in-melodies',
  world: 6,
  index: 3,
  minutes: 6,
  title: 'The Same Interval, Now Moving',
  subtitle: 'Why a tune is easier to hear than two bare notes',
  teaches: ['interval-ear'],
  requires: ['interval-ear', 'melodic-harmonic'],

  depths: {
    quick: `Inside a key, your ear stops measuring gaps and starts hearing each note's position relative to home.`,

    normal: `Two notes on their own give you nothing but a distance. Put the same two notes
      in a melody and something else takes over: you hear where each one sits relative to
      the tonic. That is a different skill, and for tonal music it is the faster one,
      because there are only seven common positions to recognise instead of twelve
      distances measured from a moving starting point.`,

    deep: `Scale degrees have personalities and interval sizes do not. The seventh degree
      leans upward toward home, the fourth leans down toward the third, and the fifth sits
      still and open. Once you have heard those characters a few hundred times, a melody
      stops being a chain of leaps and becomes a sequence of places. This is why the same
      interval can feel completely different in two spots: a major third from degree one up
      to degree three sounds settled and arrived, while the same major third from five up to
      seven sounds restless, because the note you land on is a note that wants to move.
      Interval hearing has not gone away. It becomes the tool you reach for when the music
      leaves the key or has no key at all.`,

    nerd: `Movable-do solfège is the traditional machinery for this, and its advantage is
      that it attaches a syllable to a function rather than to a pitch, so the training
      transposes automatically. Numbers work just as well for most people, and scale-degree
      numbers have the advantage of matching the Roman numerals you already use for chords.
      Minor is where systems disagree loudly. Some traditions keep do on the tonic of the
      minor key, some move it to the relative major, and either choice makes some things
      obvious and some things awkward. Pick one and stay with it, because switching halfway
      costs more than either option costs on its own. Worth knowing too: a drone underneath
      is not a training wheel you discard. Plenty of professionals still check themselves
      against a held tonic, because it makes the function of a note audible instead of
      inferred.`,
  },

  steps: {
    why: {
      text: `Transcribing a melody by naming one interval at a time is exhausting and it
        goes wrong quickly, since a single mistake shifts everything after it. Musicians
        who do this fluently are mostly not measuring gaps at all. They are hearing where
        each note lives.`,
    },

    hear: {
      text: `A short figure in a major key. Rather than measuring the leaps, listen for
        which note feels like home and how far each of the others sits from it.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 5, 6, 5, 3, 1] },
      playback: 'sequence',
    },

    see: {
      text: `Same figure, labelled by degree instead of by note name. The shape is what
        survives when you change key, which is why degrees are the useful label.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 5, 6, 5, 3, 1] },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Hold a drone on the tonic and play single notes from the scale over it,
          with the labels off. Name each one as a degree before revealing it.`,
        noticing: `With the tonic sounding underneath, notes stop being distances and start
          having addresses. The seventh strains upward, the fourth sags, the fifth just
          sits there. Those characters are what you are learning to recognise.`,
        views: ['pitchring', 'piano'],
        labelMode: 'none',
        controls: ['play', 'reveal', 'tonic-picker', 'compare', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Scale-degree hearing',
      text: `Identifying a note by its role in the key rather than by its distance from the
        note before it. In practice you hold a tonic in your memory, or under your fingers,
        and everything else is heard against it.`,
      alsoCalled: ['functional ear training', 'movable do', 'solfège'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `A drone holds the tonic. Which degree of the scale did you just hear?`,
        reps: 10,
        asks: 'note-name',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['major'] },
        feedback: `If a degree will not resolve, sing from the tonic upward until you reach
          it and count where you stopped. That is slow, and it gets quicker.`,
      },
    },

    apply: {
      text: `Working out a song by ear usually starts by finding the tonic, not the first
        note. Once home is fixed, every other note has somewhere to be, and the melody
        stops being a list of unrelated pitches.`,
      task: `Hum the opening of a song you know well. Then hum the note it would end on if
        it stopped right now and felt finished. That second note is almost always the
        tonic, and the first note is a degree you can now name.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 3, 2, 1] },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `No drone this time. Name the gap between each pair of notes.`,
        reps: 8,
        asks: 'interval-name',
        mode: 'melodic-up',
        difficulty: 4,
        pool: { kind: 'interval', ids: ['M2', 'm3', 'M3', 'P4', 'P5', 'M6'] },
        feedback: `Without a tonic underneath you are back to measuring, so anchor first
          and refine second. Deciding "wider than a third" is already most of the work.`,
      },
    },

    review: {
      takeaways: [
        `In a key, notes have positions rather than distances, and positions have characters.`,
        `Degrees transpose for free, which is why they beat note names for this.`,
        `Interval hearing is still the fallback when the music leaves the key.`,
      ],
      next: `Single notes are done. Stack three at once and the question changes.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w6-l4-triads-by-ear',
  world: 6,
  index: 4,
  minutes: 6,
  title: 'Four Triads, Four Colours',
  subtitle: 'Major, minor, diminished and augmented without looking',
  teaches: ['chord-quality-ear'],
  requires: ['interval-ear', 'third', 'perfect-family'],

  depths: {
    quick: `The third tells you major or minor, and the fifth tells you whether the chord is diminished or augmented.`,

    normal: `Four triads, and two questions sort all of them. Is the third bright or dark,
      and is the fifth stable, squeezed or stretched? A major chord has a bright third and a
      stable fifth. Minor darkens the third and moves nothing else. Diminished darkens the
      third and squeezes the fifth, so it sounds tight and unfinished, and augmented keeps
      the bright third while stretching the fifth, which leaves it floating with no obvious
      top.`,

    deep: `The fastest reliable technique is to arpeggiate the chord in your head. Hearing
      three notes at once is harder than hearing them one at a time, because the overtones
      blend and the individual pitches stop being separately audible, so unpacking the
      block into a line converts an unfamiliar problem into one you solved two lessons ago.
      The last two are worth extra attention, for opposite reasons. Diminished
      is tense in a way that points somewhere, since the squeezed fifth is a tritone and a
      tritone wants to resolve. Augmented is tense and points nowhere, because two stacked
      major thirds divide the octave evenly and no note in it has a better claim to being
      the root than any other.`,

    nerd: `Voicing changes the difficulty enormously, and drills that only ever play close
      root position build a skill that partly evaporates on real music. A major triad with
      the third in the bass sounds noticeably less settled than root position, and a wide
      voicing with the fifth doubled sounds emptier than either. Register matters too:
      thirds voiced low on a piano turn muddy, which is why arrangers spread chords out
      downstairs. There is a real ambiguity to be honest about with augmented chords. C, E
      and G sharp is also E, G sharp and B sharp, and A flat, C and E, and no amount of
      listening will tell you which spelling the composer had in mind. Context does that,
      not the ear, and the chord is symmetrical precisely so that it can pivot.`,
  },

  steps: {
    why: {
      text: `Naming a chord by looking at it is a spelling exercise you have already done.
        Doing it from a recording is what actually lets you play along with music nobody
        wrote down, and it turns out to depend on hearing far less than you would think:
        one note in the middle, and one at the top.`,
    },

    hear: {
      text: `A minor triad, spread out and then played as a block. The middle note is doing
        all of the emotional work.`,
      example: { kind: 'chord', chordId: 'minor' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `The same chord once you have decided. Three notes, and the interval labels
        show where the darkness came from.`,
      example: { kind: 'chord', chordId: 'minor' },
      views: ['piano', 'pitchring'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'quality-shifter',
        prompt: `Labels off. Move the middle note by a half step, then the top note, and
          say what the chord has become before you reveal anything.`,
        noticing: `Four chords sit within two half steps of each other. Moving the third
          swaps bright for dark; moving the fifth swaps stable for tense. Every triad you
          will meet is one of those four combinations.`,
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        controls: ['accidental-step', 'play', 'compare', 'reveal', 'reset'],
        example: { kind: 'chord', chordId: 'major' },
      },
    },

    name: {
      term: 'Chord quality by ear',
      text: `Deciding what kind of chord you are hearing without seeing or spelling it. The
        question is always the same shape: what is the third doing, and what is the fifth
        doing. Everything else about the chord can wait.`,
      alsoCalled: ['chord recognition', 'harmonic identification'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Two chords in a row. Same quality, or different?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'augmented'] },
        feedback: `Comparing is easier than naming, and it is a real step on the way.
          Listen to the middle of the chord in both, and ignore the outside.`,
      },
    },

    apply: {
      text: `Almost every song you know is mostly major and minor triads, which means the
        skill pays off immediately rather than after some future milestone. A chord you can
        label as minor is a chord you can play along with, even before you know its root.`,
      task: `Put on a track you like and pause on a chord you can hear clearly. Decide
        bright or dark before you touch an instrument, then find the chord and check
        whether you were right.`,
      example: { kind: 'chord', chordId: 'diminished' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Hear a triad, then play it back. Any key, root position.`,
        reps: 8,
        asks: 'construct',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'augmented'] },
        feedback: `Reproducing a chord is a harder test than naming it and a much better
          one, because you cannot fake it. Sing the bottom note first, then build upward.
          An augmented triad has no root position worth arguing about, so any of its three
          notes on the bottom counts as correct.`,
      },
    },

    review: {
      takeaways: [
        `The third decides bright or dark; the fifth decides stable, tense or floating.`,
        `Arpeggiate a block chord in your head to turn it into a problem you can already solve.`,
        `An augmented triad is symmetrical, so no amount of listening reveals its root.`,
      ],
      next: `Add one more note on top and the four chords become a dozen.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w6-l5-sevenths-by-ear',
  world: 6,
  index: 5,
  minutes: 6,
  title: 'One More Note Changes Everything',
  subtitle: 'Telling seventh chords apart by sound',
  teaches: ['chord-quality-ear'],
  requires: ['chord-quality-ear', 'seventh'],

  depths: {
    quick: `In a seventh chord the third and the seventh carry the identity, and the root and fifth barely matter.`,

    normal: `Five seventh chords cover most of what you will meet. Major seventh sounds lush
      and finished. Dominant seventh sounds full but unresolved, because there is a tritone
      hiding inside it. Minor seventh is smooth and oddly neutral. Half-diminished floats
      and sounds thin. Diminished seventh is four notes stacked in equal steps, so it sounds
      urgent and rootless at the same time.`,

    deep: `The third and the seventh are called guide tones because between them they define
      the chord. Take a dominant seventh, remove the root and the fifth, and the remaining
      two notes still sound like a dominant seventh, since the tritone between them is the
      thing you were recognising all along. Pianists exploit this constantly by voicing
      chords with guide tones and leaving the root to the bass player. For your ear it means
      the identification job is smaller than it looks: find the top note, decide whether it
      is a half step or a whole step below the octave, and you have already halved the
      possibilities before you have thought about the third.`,

    nerd: `The diminished seventh is the honest edge case. Four notes a minor third apart
      divide the octave evenly, so the chord has four equally defensible roots and no
      listening test can pick between them. Which one is correct depends on where the music
      goes next, and a composer can use exactly that to slide between distant keys. The
      half-diminished chord has a naming problem instead of an ambiguity problem: written as
      m7 flat 5 it looks like an altered minor chord, and written with the slashed circle it
      looks like a diminished chord, and both spellings describe the same four notes doing
      the same job. One more piece of honesty. Dominant sevenths in blues and much of rock
      do not resolve at all, so training yourself to hear that chord as tension awaiting
      release will mislead you for an entire genre.`,
  },

  steps: {
    why: {
      text: `Triads run out fast once you listen to anything written after about 1900. Jazz,
        soul, bossa nova and most film scoring live on four-note chords, and the difference
        between two of them is often a single half step near the top.`,
    },

    hear: {
      text: `A dominant seventh, spread out and then together. Somewhere inside it there are
        two notes six half steps apart, and that pair is what you are actually recognising.`,
      example: { kind: 'chord', chordId: 'dom7' },
      playback: 'sequence-then-chord',
    },

    see: {
      text: `Now the chord, after the fact. The third and the seventh are the two that
        matter, and they sit at opposite ends of the stack.`,
      example: { kind: 'chord', chordId: 'dom7' },
      views: ['piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'melodic-harmonic-toggle',
        prompt: `Play a seventh chord as a block with the labels off, guess, then play the
          same notes one at a time and guess again. Reveal last.`,
        noticing: `Spread out, the chord is four intervals you can name. Played together it
          becomes a single colour. Most people are far more accurate on the arpeggio, which
          is why unpacking a block chord mentally is worth practising on purpose.`,
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        controls: ['play', 'compare', 'tempo', 'reveal', 'reset'],
        example: { kind: 'chord', chordId: 'min7' },
      },
    },

    name: {
      term: 'Guide tones',
      text: `The third and the seventh of a chord. Between them they carry the quality, so
        a voicing that keeps those two and drops the rest still sounds like the chord it
        claims to be. Listening for them is faster than listening to all four notes.`,
      symbol: '3 and 7',
      alsoCalled: ['the defining tones', 'shell voicing'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Two seventh chords. Same quality, or different?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['maj7', 'dom7', 'min7'] },
        feedback: `Listen at the top. Major seventh sits a half step below the octave and
          bites slightly; minor seventh sits a whole step below and does not.`,
      },
    },

    apply: {
      text: `The gap between a major seventh and a dominant seventh is one half step, and it
        decides whether a song can end on that chord. Ending on a dominant leaves the
        listener waiting, which is why so many blues tunes feel like they could start again
        at any moment.`,
      task: `Play a major seventh chord and hold it. Lower the top note by a half step and
        hold that. The first one is a place to stop; the second one is a question.`,
      example: { kind: 'chord', chordId: 'maj7' },
    },

    challenge: {
      drill: {
        kind: 'build',
        prompt: `Hear it, then play it back. Five options, and one of them has no single
          right root.`,
        reps: 8,
        asks: 'construct',
        mode: 'harmonic',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['maj7', 'dom7', 'min7', 'half-dim7', 'dim7'] },
        feedback: `On a diminished seventh, any of its four notes will do as the root, and
          your answer counts as correct. That is the chord being symmetrical, not you
          getting away with something.`,
      },
    },

    review: {
      takeaways: [
        `The third and seventh define the chord; the root and fifth can go missing.`,
        `A diminished seventh has four possible roots and the ear cannot choose between them.`,
      ],
      next: `Chords one at a time is the easy version. Real music keeps moving.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w6-l6-function-by-ear',
  world: 6,
  index: 6,
  minutes: 6,
  title: 'Home, Leaving, Straining',
  subtitle: 'Hearing what a chord is doing rather than what it is called',
  teaches: ['progression-ear'],
  requires: ['chord-quality-ear'],

  depths: {
    quick: `Before you can name a chord in passing, you can hear its job: at rest, on the way, or under tension.`,

    normal: `Three jobs cover most of tonal harmony. A chord can be home, which feels like
      you could stop there. It can be on the way, setting something up without arriving. Or
      it can be tense, usually because it contains the tritone that pulls back toward home. You
      can hear which job a chord is doing long before you can name the chord itself, and
      for playing along that is often all you need.`,

    deep: `The test that works in real time is to hold the tonic in your voice while the
      music plays. When the chord underneath contains your note and sits comfortably with
      it, you are home. If the note starts to feel like it is fighting the chord, you are
      somewhere on the way. And a chord that makes your held note feel like it has to move
      is the dominant. This is why function is easier to hear than chord quality:
      you are judging one relationship rather than identifying four pitches, and the
      relationship is to a note you are already holding.`,

    nerd: `The three-way split is a simplification and it starts leaking almost immediately.
      Degree six does tonic work in some contexts and predominant work in others,
      depending entirely on what follows it. A subdominant chord can behave as an arrival
      rather than a preparation, which is what a plagal ending is. Modal music breaks the
      scheme harder, since the pull that makes a dominant sound like a dominant comes from
      the leading tone, and several modes do not have one. None of that makes the three
      categories useless. It makes them a first pass that gets you most of the way, with the
      exceptions worth learning as exceptions rather than pretending the rule was never
      approximate.`,
  },

  steps: {
    why: {
      text: `Identifying chords one at a time works fine when someone plays them for you and
        waits. Music does not wait. What survives at speed is a coarser judgement, made in
        about a second, about whether the harmony has arrived, is setting something up, or
        is straining.`,
    },

    hear: {
      text: `The roots of three chords doing the three jobs, played as single notes: home,
        then on the way, then the tense one, then home an octave up.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 4, 5, 8] },
      playback: 'sequence',
    },

    see: {
      text: `The same four notes, labelled by degree. Root motion alone carries a surprising
        amount of the information, which is the idea the next lesson runs on.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 4, 5, 8] },
      views: ['pitchring', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'tritone-mirror',
        prompt: `Labels off. Find the two notes six half steps apart inside a dominant
          seventh, play just those two, then play the whole chord again.`,
        noticing: `The tension you hear in a dominant chord is that pair and almost nothing
          else. Both notes lean, in opposite directions, and letting them move a half step
          each is what makes the arrival home sound inevitable.`,
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        controls: ['play', 'invert', 'compare', 'reveal', 'reset'],
        example: { kind: 'chord', chordId: 'dom7' },
      },
    },

    name: {
      term: 'Harmonic function',
      text: `What a chord is doing in a key, as opposed to what it is built from. Three
        categories carry most of the work: tonic for home, predominant for on the way, and
        dominant for the tense chord that wants to resolve. Two chords with different names
        can hold the same job.`,
      alsoCalled: ['tonic, predominant, dominant', 'home, away, tension'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `The tonic chord plays, then a second chord. Has the music arrived home, or
          is it still somewhere else?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        feedback: `Hum the tonic through both chords. When your note stops feeling
          comfortable, the chord is doing something other than home.`,
      },
    },

    apply: {
      text: `Playing by ear in a band is mostly this judgement, made fast and repeatedly.
        You do not need the name of the chord to know that the phrase is about to land, and
        knowing it is about to land is what lets you land with it.`,
      task: `Put on a song with a clear beat and tap only on the chords that sound like
        home. Ignore everything else. The pattern of your taps is the shape of the tune.`,
      example: { kind: 'chord', chordId: 'dom7' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Two chords, neither of them home. Do they want to go to the same place?`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 4,
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7', 'half-dim7', 'diminished'] },
        feedback: `Tension is not one flavour. A dominant leans hard in a specific
          direction; a predominant is restless without pointing anywhere in particular.`,
      },
    },

    review: {
      takeaways: [
        `Function is coarser than chord quality and much faster to hear.`,
        `Hold the tonic in your voice and judge every chord against it.`,
        `The three categories are a first pass, and the sixth degree in particular breaks them.`,
      ],
      next: `One chord at a time is still too slow. Progressions have shapes you can catch whole.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w6-l7-progression-shapes',
  world: 6,
  index: 7,
  minutes: 7,
  title: 'Progressions Have Shapes',
  subtitle: 'Catching a chord sequence whole instead of one chord at a time',
  teaches: ['progression-ear'],
  requires: ['progression-ear'],

  depths: {
    quick: `Experienced listeners recognise a progression as one familiar shape rather than as a series of separate chords.`,

    normal: `Nobody identifies four chords in four seconds by doing four identifications.
      What happens instead is pattern matching. A handful of progressions turn up constantly,
      and once you have heard each one a few hundred times the whole loop arrives as a
      single recognition, the way a word arrives rather than a row of letters. The bass line
      is your fastest handle on which shape you are hearing.`,

    deep: `Root motion is the skeleton. Chords moving down by a fifth feel like they are
      being pulled forward, which is why sequences built on that motion sound like they are
      going somewhere on their own. Motion down by a third feels gentle and slightly
      wistful, because the two chords share two notes and very little actually changes.
      Going up by a second feels like effort, a small push against the grain. Learn those
      three sensations and you can describe an unfamiliar progression before you can name
      any chord in it, which is usually enough to play along.`,

    nerd: `Two warnings about pattern matching. The first is that a lot of songs share the
      same loop, so recognising the shape tells you far less about which song you are
      hearing than it feels like it should. Loops also get rotated. Take the same four
      chords, start on a different one, and the result sounds different enough to fool you
      while being the same set. Shapes are key-independent too, so knowing you are hearing
      a loop of that kind still leaves you needing to find the tonic before you can play
      it. Real recordings add a third problem, which is that the bass player is not
      always on the root. Inversions, pedal points and passing notes in the bass will all
      contradict the harmony above them, and a bass line is a strong hint rather than a
      reliable readout.`,
  },

  steps: {
    why: {
      text: `Chord by chord identification tops out at roughly one chord every two seconds,
        and most music moves faster than that. Getting past the ceiling means changing what
        you are recognising, from individual chords to whole patterns.`,
    },

    hear: {
      text: `Four roots, played as single notes, in one of the most common loops in popular
        music. Listen to the shape of the movement rather than to any one note.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 4, 5] },
      playback: 'sequence',
    },

    see: {
      text: `The same four roots by degree. A bass player might take that first move up a
        sixth or down a third, and as root motion those are the same step, so the loop
        reads as down a third, down a third, up a second, back to the start.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 4, 5] },
      views: ['pitchring', 'staff'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Labels off. Walk the roots of a four-chord loop one move at a time and say
          the size and direction of each move out loud before revealing it.`,
        noticing: `Three or four root moves account for nearly everything: down a fifth,
          down a third, up a second, up a fourth. A progression is a short sentence built
          out of those, and the sentence repeats.`,
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        controls: ['play', 'direction', 'tempo', 'reveal', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 4, 5, 1] },
      },
    },

    name: {
      term: 'Root motion',
      text: `The pattern the chord roots trace, independent of what is stacked on top of
        them. Two progressions with the same root motion sound related even when their
        chord qualities differ, which is why the bass line is the first thing to listen for
        and the last thing to give up on.`,
      alsoCalled: ['the bass motion', 'harmonic rhythm and shape'],
    },

    practice: {
      drill: {
        kind: 'order',
        prompt: `A loop plays, then the same chords arrive out of order. Put them back.`,
        reps: 6,
        asks: 'construct',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        feedback: `Find the chord that sounds like home first and anchor the loop on it.
          Ordering the other three is much easier once one position is fixed.`,
      },
    },

    apply: {
      text: `Once a loop is recognisable you can play along with a song you have never heard,
        which is the point at which ear training stops being homework. Getting the shape
        right and the key wrong sounds obviously bad, so find the tonic before you commit.`,
      task: `Choose a song you like and sing only its bass line, ignoring the melody
        entirely. Then work out the size and direction of each move. Four chords is usually
        the whole song.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [6, 4, 1, 5] },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Two loops in different keys. Same shape, or genuinely different?`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        difficulty: 5,
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        feedback: `Ignore the pitches completely and compare the moves. A shape rotated to
          start on a different chord is the same shape, and that is the trap here.`,
      },
    },

    review: {
      takeaways: [
        `Recognise the loop as one shape instead of identifying four chords in a row.`,
        `Root motion is the skeleton, and down a fifth, down a third and up a second cover most of it.`,
        `A bass line is a strong hint about the harmony rather than a reliable readout of it.`,
      ],
      next: `Time to write some of it down.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w6-l8-transcribe-a-melody',
  world: 6,
  index: 8,
  minutes: 8,
  title: 'Write Down What You Just Heard',
  subtitle: 'A short melody, from sound to staff',
  teaches: ['transcription'],
  requires: ['progression-ear', 'reading-treble-bass'],

  depths: {
    quick: `Find the tonic, get the rhythm down, then fill in the pitches as scale degrees and convert at the end.`,

    normal: `Transcription is a procedure rather than a talent. Find the tonic first, because
      every later decision depends on it. Get the rhythm on paper before you touch a single
      pitch, since rhythm errors are harder to spot afterwards and they wreck everything
      downstream. Work in chunks of two or three notes and loop them. Write degrees rather
      than note names while you work, and convert to real notes once the shape is right.`,

    deep: `Working in degrees rather than letters is the part that saves the most time. A
      degree is a judgement you can make from the sound alone, and it stays correct even if
      you later discover the key was a half step away from where you thought. Letters
      require you to have been right about the key from the first note. Looping short chunks
      matters for a related reason: your ear stores a phrase for a few seconds and then it
      degrades, so replaying the same two seconds ten times is genuinely more useful than
      replaying the whole passage twice. Sing what you have written back against the
      recording at the end. Anything wrong will announce itself immediately, and you will
      hear it long before you would see it.`,

    nerd: `Some honest arithmetic about how long this takes. A first transcription of eight
      bars can take an hour, and that is not a sign of anything going wrong. Speed comes
      from having done many of them, not from a technique nobody told you about. A few
      things make specific passages genuinely hard rather than merely unfamiliar. Fast
      passages benefit from slowing the audio down, and modern pitch-preserving slowdown is
      accurate enough that it is not cheating, though it does smear the attacks. Recordings
      are not always at concert pitch, since tape speed, tuning preferences and later
      remastering all shift things, so a melody that stubbornly refuses to sit in any key
      may be forty cents flat rather than exotic. And drums or heavy distortion will mask
      the bass, which is why the bass line is sometimes the last thing you get rather than
      the first.`,
  },

  steps: {
    why: {
      text: `Everything in this world so far has been recognition, which stops at the point
        where you could describe what you heard. Writing it down is the test that catches
        the gaps, because a melody you can hum but cannot notate is a melody you only half
        know.`,
    },

    hear: {
      text: `A six-note figure. Play it three times before you attempt anything, and try to
        hold it in your head after the sound stops.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 5, 6, 5, 8, 7] },
      playback: 'sequence',
    },

    see: {
      text: `The same figure written out, with degree labels. Its fifth note is the tonic
        an octave up, which the label writes as a 1, because a degree names a position in
        the scale and ignores register. Compare the whole thing against what you held in
        your head and note where the two disagreed.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 5, 6, 5, 8, 7] },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'staff-plotter',
        prompt: `Labels off. Hear a note, decide its degree, place it on the staff, and only
          then reveal. Work through the scale in a random order.`,
        noticing: `Placing a note commits you in a way that thinking about it does not. The
          degrees you get wrong are consistent from session to session, and finding out
          which two they are is worth more than a dozen correct answers.`,
        views: ['staff', 'piano'],
        labelMode: 'none',
        controls: ['play', 'reveal', 'clef-switch', 'tonic-picker', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Transcription',
      text: `Writing down music you can only hear, accurately enough that someone else could
        play it back. The classroom version is called dictation and it is the same skill
        under exam conditions, usually with a shorter phrase and a stricter clock.`,
      alsoCalled: ['dictation', 'taking it down by ear', 'lifting'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Three notes at a time over a drone. Name each one as a degree, in order.`,
        reps: 10,
        asks: 'note-name',
        mode: 'melodic-up',
        pool: { kind: 'scale', ids: ['major', 'aeolian'] },
        views: ['staff'],
        labelMode: 'none',
        feedback: `Do not carry a wrong note forward. If the second one will not settle,
          replay from the tonic and rebuild the phrase from there.`,
      },
    },

    apply: {
      text: `Transcribing a solo you love is the fastest way to absorb somebody's phrasing,
        far faster than reading a transcription somebody else made. The work you resent
        while doing it is the work that changes your playing.`,
      task: `Pick eight bars of something you know well. Write the rhythm first, with no
        pitches at all. Then add degrees, then convert to notes, then sing it back against
        the recording and fix whatever fights.`,
      example: { kind: 'degrees', scaleId: 'aeolian', degrees: [1, 3, 2, 1, 7] },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `Descending, and in minor. The degree characters you learned in major do not
          transfer cleanly.`,
        reps: 8,
        asks: 'note-name',
        mode: 'melodic-down',
        difficulty: 5,
        pool: { kind: 'scale', ids: ['aeolian', 'dorian'] },
        views: ['staff'],
        labelMode: 'none',
        feedback: `A minor third above the tonic feels nothing like a major third above it,
          and the sixth degree is the one that separates these two scales. Listen there
          first.`,
      },
    },

    review: {
      takeaways: [
        `Tonic first, rhythm second, pitches last.`,
        `Write degrees while you work and convert to note names at the end.`,
        `Sing your version back against the recording. Errors are audible long before they are visible.`,
      ],
      next: `One thing left. Everything you can hear is also something you can play.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w6-l9-frames-for-improvising',
  world: 6,
  index: 9,
  minutes: 7,
  title: 'Playing From What You Can Hear',
  subtitle: 'The chord underneath as a frame for the line on top',
  teaches: ['improvisation-frames'],
  requires: ['progression-ear', 'transcription'],

  depths: {
    quick: `Improvising is transcription running backwards: you hear a line first, and knowing the chord tells you where its notes are.`,

    normal: `A frame is what the chord underneath makes available. Its own notes will land
      and sound settled. The notes a step away from them will lean and want to move. Notes
      outside the key will sound deliberate or wrong depending entirely on whether you meant
      them. Knowing the frame does not tell you what to play. It tells you what each choice
      will do, which is what lets you play the thing you already heard in your head.`,

    deep: `Three frames, in rising order of precision and effort. One scale over the whole
      progression, usually a pentatonic, which is safe and quickly becomes monotonous
      because it ignores what the chords are doing. Chord tones, which sound strong and
      deliberate and immediately make a line follow the harmony. A scale chosen per chord,
      which is the most precise and the most work, since it means knowing what the chord is
      before it arrives. Most players use all three within a single chorus without
      announcing the switch. The one thing worth being firm about is direction of travel:
      the ear leads and the theory follows. Running a scale up and down over a chord is
      practice, and it is not yet improvising.`,

    nerd: `Scales are a filter rather than a source, which is the point most chord-scale
      teaching gets accused of missing, sometimes fairly. A scale tells you which notes will
      not fight the chord; it says nothing about rhythm, shape, register or when to stop,
      and those are the things listeners actually respond to. The strongest notes over a
      dominant chord are the third and the seventh, and a line that hits those on strong
      beats will sound like it knows the tune even when everything between them is loose.
      Two more details worth knowing. Avoid notes are context-dependent rather than
      absolute: the fourth over a major seventh chord clashes because it sits a half step
      above the third, and the same fourth over a suspended chord is the whole point. And
      the players you admire mostly did not learn this as a list of scales. They transcribed
      a great deal, which is why this lesson sits after the transcription one rather than
      instead of it.`,
  },

  steps: {
    why: {
      text: `Ear training that stops at recognition is only half of a skill. The other half
        is being able to play what you hear, and the gap between those two is where most
        people give up on improvising and start reciting patterns instead.`,
    },

    hear: {
      text: `Four notes drawn from a mixolydian scale: the first, third, fifth and flat
        seventh degrees. These are exactly the notes of the dominant seventh chord the
        scale belongs to, which is why a line built from them cannot land wrong.`,
      example: { kind: 'degrees', scaleId: 'mixolydian', degrees: [1, 3, 5, 7] },
      playback: 'sequence',
    },

    see: {
      text: `The same four notes stacked into the chord they came from. A line and a chord
        made of one set of pitches, which is the whole idea in a picture.`,
      example: { kind: 'chord', chordId: 'dom7' },
      views: ['piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Hold a dominant seventh chord and play single notes over it with the labels
          off. Sort each one into lands, leans, or fights before you reveal what it was.`,
        noticing: `Chord tones settle. Notes a step above a chord tone lean toward it and
          sound unfinished if you stop there. One or two notes fight outright, and they are
          usually a half step above a chord tone rather than anywhere exotic.`,
        views: ['piano', 'pitchring'],
        labelMode: 'none',
        controls: ['play', 'reveal', 'tonic-picker', 'compare', 'reset'],
        example: { kind: 'scale', scaleId: 'mixolydian' },
      },
    },

    name: {
      term: 'Playing over changes',
      text: `Choosing notes in real time because you know what the chord underneath is
        doing. The frame is the set of notes the chord makes available and what each one
        will sound like; the line is still yours to invent.`,
      alsoCalled: ['playing the changes', 'soloing over a progression'],
    },

    practice: {
      drill: {
        kind: 'match',
        prompt: `A chord plays. Play four notes that belong to it, without looking.`,
        reps: 8,
        asks: 'construct',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['maj7', 'dom7', 'min7', 'half-dim7'] },
        feedback: `Start from the note you can hear most clearly, usually the bottom one,
          and build in thirds from there. Getting three of four is a pass.`,
      },
    },

    apply: {
      text: `Restriction is what makes this practicable. Improvising with four available
        notes forces you to make music out of rhythm and shape, which is where most of the
        interest lives anyway, and it removes the option of hiding inside a scale run.`,
      task: `Loop two chords at a slow tempo. Play only chord tones for two minutes, using
        rhythm alone to make it interesting. Then allow yourself one note from outside and
        notice how much weight that single note carries.`,
      example: { kind: 'chord', chordId: 'dom9' },
    },

    challenge: {
      drill: {
        kind: 'ear',
        prompt: `A chord, then a line over it. Does every note belong to the frame, or is
          one of them fighting?`,
        reps: 8,
        asks: 'same-different',
        mode: 'melodic-up',
        difficulty: 5,
        pool: { kind: 'scale', ids: ['mixolydian', 'dorian', 'blues', 'altered'] },
        feedback: `A wrong note and a deliberate outside note sound different because of
          what happens next. Judge whether the line resolved it or abandoned it.`,
      },
    },

    review: {
      takeaways: [
        `The chord underneath tells you what each note will do, and nothing about what to play.`,
        `Chord tones land, their neighbours lean, and the ear should lead the theory.`,
        `Restricting yourself to four notes makes rhythm and shape do the work.`,
      ],
      next: `That is the course. The ear is the only part of it that keeps improving after
        you stop studying, so keep the ten minutes.`,
    },
  },
});

// ---------------------------------------------------------------------------

export const WORLD_6 = defineWorld({
  id: 'world-6',
  number: 6,
  title: 'Open Ear',
  tagline: 'Do it without looking',
  blurb: `Nine lessons with the picture switched off. Intervals on their own and inside
    melodies, chord qualities from sound alone, harmony recognised by what it is doing
    rather than what it is called, a melody written down from scratch, and the whole lot
    turned around so you can play what you hear. Slower going than the other six worlds,
    and the only one that keeps paying out after you finish it.`,
  lessons: [L1, L2, L3, L4, L5, L6, L7, L8, L9],
});

export default WORLD_6;
