/**
 * WORLD 5: PROGRESSION LAB
 *
 * Ten microlessons on why harmony moves.
 *
 * World 4 hands the learner a key and the chords that come free with it. This
 * world asks the next question: given seven chords, why does any particular
 * order of them sound like it is going somewhere? The answer offered here is
 * function, and the lessons are careful to say out loud that function is a
 * simplification rather than a law. A learner who is told "vi is a tonic
 * chord" as a fact will be baffled the first time vi behaves like a
 * predominant. A learner who is told it is a filing decision will not.
 *
 * The spine of the world is one interval. The tritone inside a dominant
 * seventh is what makes dominant function dominant, it is what a cadence
 * resolves, it is what voice leading moves by half steps, and it is what a
 * secondary dominant imports from a foreign key. Lesson 1 puts it on the ring
 * and the nine after it keep pointing at it.
 *
 * Ten lessons over the five concept ids World 5 owns. A concept may be taught
 * by more than one lesson: the first to name it owns it, the ones after it
 * develop it, and validateCourse keeps only that first teacher. So harmonic
 * function gets three lessons (the three jobs, the guide tones, the ii V I),
 * cadence gets three (punctuation, the deceptive ending, the turnaround),
 * voice leading gets two, and the two chromatic ideas get one each.
 *
 * A note on ids. The five lessons this world shipped with keep the ids they
 * had, so the N in w5-lN is a stable creation-order label and not a position:
 * the five later lessons are numbered l6 to l10 and sit wherever the teaching
 * order wants them. `index` is the field that says where a lesson actually is.
 *
 * As everywhere in this course, no example holds notes. Every one is a recipe
 * the engine builds, so every chord here is correct in all twelve keys,
 * including the ones where a borrowed iv comes out with a double flat.
 */

import { defineLesson, defineWorld } from './schema.js';

// ---------------------------------------------------------------------------

const L1 = defineLesson({
  id: 'w5-l1-three-jobs',
  world: 5,
  index: 1,
  minutes: 7,
  title: 'Home, On the Way, and Tense',
  subtitle: 'Harmonic function, and the tritone that powers it',
  teaches: ['harmonic-function'],
  requires: ['tritone', 'seventh'],

  depths: {
    quick: `Nearly every chord in a key is doing one of three jobs: sounding like home, heading somewhere, or building tension that wants to resolve.`,

    normal: `Seven chords is more than anyone can keep track of as seven separate
      objects. Sort them by job instead. Some chords sound settled and could end the
      piece. Others sound like they are on their way to something. One sounds tense enough
      that you can predict its next move, and that is the chord on the fifth degree with a
      seventh added, because that combination holds the key's only tritone. Home, on the
      way, tense. That is the whole system.`,

    deep: `The tension is not a matter of taste, and you can point at it. Add a seventh to
      the chord on the fifth degree and it contains the seventh degree of the key and the
      fourth, six half steps apart. Those two notes are the two most restless in the scale.
      The seventh degree sits a half step below the tonic and leans up into it. Its
      partner, the fourth degree, sits a half step above the third and leans down into
      that. Play them together and
      both leanings happen at once, in opposite directions, and the pair of notes they
      arrive at belongs to the tonic chord. Nothing else in the key does this, which is why
      the fifth degree gets a job title of its own. The predominant chords are named for
      where they sit, in front of the dominant. Most of them hold the fourth degree without
      the seventh, so they carry half of that tension and hand the rest along.`,

    nerd: `Function is a filing system, and files leak. The chord on the sixth degree gets
      called tonic because it shares two of its three notes with the tonic triad. It also
      moves to ii and IV as readily as any predominant does, which is why the theory engine
      behind this course files it as tonic in major and predominant in minor: the honest
      answer is that it depends. Worse is the chord on the third degree, which most working
      analysts treat as an ambiguity rather than a category. The three-way split
      descends from Hugo Riemann, who was arguing about something more specific than what
      the words are used for now. Jazz practice splits the same territory differently, with
      substitution groups rather than fixed roles, and a lot of pop and modal harmony sits
      outside the system altogether: a progression that runs flat-seven to four to one has
      no dominant in it at all and still sounds like it arrives.`,
  },

  steps: {
    why: {
      text: `A chord chart looks like a list of unrelated names, and beginners treat it as
        one. Nearly every chord in a key is doing one of three jobs. Learn to hear which
        job is which and you can guess where a song is about to go before you have heard
        it, which is roughly what people mean when they say someone has a good ear for
        harmony.`,
    },

    hear: {
      text: `The chord on the fifth degree of the key with a seventh on top. Four notes,
        played together. It does not sound like anywhere you could stop.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'P5' },
      playback: 'chord',
    },

    see: {
      text: `Two of those four notes sit directly opposite each other on the ring, six
        half steps apart. That is the tritone from World 1, now living inside a chord.
        Interval labels put it between the chord's third and its seventh, and that pair is
        the reason the whole chord refuses to sit still.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'P5' },
      views: ['pitchring', 'piano', 'staff'],
      labelMode: 'interval',
    },

    discover: {
      widget: {
        kind: 'scale-degree-map',
        prompt: `Build a triad on each degree of the scale in turn. Play it, then play the
          tonic chord straight afterwards, and notice how much of a relief the tonic was.`,
        noticing: `Degrees 1, 3 and 6 barely need the tonic afterwards; they already sound
          settled. Chords on 2 and 4 lean toward it. The ones on 5 and 7 sound like they
          have been holding their breath. As plain triads, only the chord on 7 actually
          holds the tritone. The chord on 5 gets one the moment you add its seventh, which
          is most of the reason that chord is so often played with a seventh on it.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'degree',
        controls: ['tonic-picker', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'scale', scaleId: 'major', includeOctave: true },
      },
    },

    name: {
      term: 'Harmonic function',
      text: `Three jobs. Tonic is home, and arriving there sounds like the phrase is over.
        Predominant is on the way, and its job is to set up what comes next. Dominant is
        the tense one, carrying the tritone that resolves into the tonic chord. Written out
        as a shape, an extremely ordinary progression reads tonic, predominant, dominant,
        tonic, with the choice of actual chord in each slot left to you.`,
      symbol: 'T → PD → D → T',
      alsoCalled: ['function', 'chord function', 'tonal function'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Two chords from the same key, one after the other. Do they hold the same
          job, or different ones?`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'dom7'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        difficulty: 2,
        feedback: `Ask what each chord makes you expect. Two chords that both make you
          expect the tonic are doing the same job, whatever they are called.`,
      },
    },

    apply: {
      text: `The reason this is worth the effort is that it survives being moved. A
        progression written as tonic, predominant, dominant, tonic works in any key, on any
        instrument, with major or minor chords in the predominant slot, and it will still
        sound like it arrives somewhere at the end.`,
      task: `Play the tonic triad below. Then play the chord a fifth above it with a
        seventh added, then come back. Do it twice and listen for the moment the tension
        drops.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Statements about what a chord is doing. Some of them are the tidy version
          rather than the true one.`,
        reps: 6,
        asks: 'same-different',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['piano', 'staff'],
        labelMode: 'degree',
        difficulty: 3,
        feedback: `The sixth degree is the one to watch. It is filed as a tonic chord and
          it very often behaves like a predominant, so any statement that makes it one
          thing forever is overstating the case.`,
      },
    },

    review: {
      takeaways: [
        `Chords sort into three jobs: tonic, predominant, dominant.`,
        `Dominant function comes from the tritone between the fourth and seventh degrees.`,
        `The sorting is a useful simplification, and the edges of it are genuinely arguable.`,
      ],
      next: `If dominant chords want to resolve, the moment they do is worth a name. That
        moment is a cadence.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L2 = defineLesson({
  id: 'w5-l2-cadences',
  world: 5,
  index: 2,
  minutes: 6,
  title: 'Punctuation',
  subtitle: 'The four endings a listener already knows',
  teaches: ['cadence'],
  requires: ['harmonic-function', 'tritone'],

  depths: {
    quick: `A cadence is the two chords at the end of a phrase, and which two they are decides whether the phrase reads as a full stop, a comma or a swerve.`,

    normal: `Music arrives in phrases, and phrases need punctuation. The last two chords do
      that work. Dominant to tonic is the strongest ending available and sounds like a full
      stop. Predominant to tonic is softer and slightly ceremonial. Stopping on the
      dominant leaves the phrase open, like a comma or a raised eyebrow. And going to the
      sixth degree where the tonic was expected is the harmonic equivalent of a sentence
      that turns out to have more in it than you thought.`,

    deep: `Cadences are the reason you can tell that a piece has ended without being told,
      and you learned them long before you learned any theory. The strongest one works
      because of the tritone. In the dominant seventh the seventh degree of the key leans
      up a half step and the fourth degree leans down a half step, and when they both go
      the pair lands on the tonic and third of the home chord. Every other ending is
      weaker in a specific and describable way. The plagal cadence has no tritone in it,
      so nothing is being released, only relaxed into. A half cadence stops on the
      tension instead of resolving it. Most interesting is the deceptive cadence, which
      resolves the tritone properly and then puts a different chord underneath the
      arrival, so the tension goes and the sense of home does not. Composers use that to keep a phrase going for another four
      bars, and listeners fall for it every time.`,

    nerd: `The classification goes finer than four names. An authentic cadence is called
      perfect when both chords are in root position and the melody lands on the tonic, and
      imperfect when either of those fails, which is a distinction about how final it
      sounds rather than about what the chords are. The plagal cadence has a reputation
      problem: it is traditionally described as the amen ending, and a good deal of
      scholarship argues it is better understood as an extension after the real cadence
      than as a cadence in its own right. Names also drift by country. What British texts
      call a perfect cadence, American texts usually call a perfect authentic cadence, and
      the half cadence turns up as the imperfect cadence in older British writing, which
      means the same two words can describe two different things depending on whose book
      you are holding.`,
  },

  steps: {
    why: {
      text: `You already know when a piece of music has finished, and nobody taught you
        that. The information is carried almost entirely by the last two chords. Two.
        Naming those pairs turns something you have only ever been on the receiving end of
        into something you can do on purpose.`,
    },

    hear: {
      text: `The chord on the fifth degree, then the tonic chord, both spread out one note
        at a time. Listen to the second note of the first chord and the first note of the
        second: a half step apart, and the whole ending hangs off it.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 8, 10, 12] },
      playback: 'sequence',
    },

    see: {
      text: `The same six notes on the staff. Notice where the first group starts: on the
        fifth of the tonic chord, which is the one note that survives the change untouched.
        Its other two belong to no part of the tonic chord, and each of them sits a step
        away from a note that does. The second group is the tonic chord itself.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 8, 10, 12] },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'interval-ear',
        prompt: `Play the ending. Guess what kind of punctuation it was, then reveal.
          Then swap the final chord from the tonic to the chord on the sixth degree and try
          again.`,
        noticing: `Swapping one chord turns a full stop into a swerve, and nothing before
          it changes at all. Your ear commits to the arrival before it hears the bass. The
          deceptive version lives on exactly that.`,
        views: ['piano', 'staff'],
        labelMode: 'degree',
        controls: ['play', 'reveal', 'compare', 'tempo', 'tonic-picker'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 8, 10, 12] },
      },
    },

    name: {
      term: 'Cadence',
      text: `The chord pair that ends a phrase. Authentic runs dominant to tonic and is the
        strongest. Plagal runs predominant to tonic and is gentler. A half cadence stops on
        the dominant and leaves the phrase hanging. Deceptive means setting the tonic up
        and landing on the sixth degree instead.`,
      symbol: 'V → I',
      alsoCalled: ['authentic cadence', 'plagal cadence', 'half cadence', 'deceptive cadence'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Ending or question? Two chords, played as blocks.`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        views: ['piano'],
        labelMode: 'none',
        difficulty: 2,
        feedback: `Sing the tonic to yourself before the pair starts. If the second chord
          contains the note you were singing, the phrase has landed.`,
      },
    },

    apply: {
      text: `Songwriters use half cadences to hold a verse open and authentic cadences to
        shut a chorus. The gentler plagal ending is what tags on after the real ending, in
        hymns and in a great many rock songs that fade out on it.`,
      task: `Play the chord below, which sits a fourth above the tonic, then play the tonic
        after it. Compare that ending with the one you heard at the start of the lesson.
        Both arrive; only one of them releases anything.`,
      example: { kind: 'chord', chordId: 'major', rootInterval: 'P4' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `The setup is the same every time. Name the note the bass lands on at the
          end, and you will have caught the deceptive ones.`,
        reps: 8,
        asks: 'note-name',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        views: ['piano', 'staff'],
        labelMode: 'none',
        difficulty: 3,
        feedback: `A deceptive ending resolves the tension correctly, then puts the wrong
          bass note underneath it. Listen low. The top of the chord will fool you and the
          bottom will not.`,
      },
    },

    review: {
      takeaways: [
        `A cadence is the chord pair that punctuates the end of a phrase.`,
        `Dominant to tonic is the strongest because it resolves a tritone.`,
        `A deceptive cadence releases the tension and withholds the arrival.`,
      ],
      next: `So far the chords have been blocks. Take them apart into separate lines and a
        second layer of the craft appears.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L6 = defineLesson({
  id: 'w5-l6-guide-tones',
  world: 5,
  index: 3,
  minutes: 6,
  title: 'The Two Notes That Lean',
  subtitle: 'The tritone inside a dominant seventh, and where each half of it goes',
  teaches: ['harmonic-function'],
  requires: ['cadence', 'tritone'],

  depths: {
    quick: `The third and seventh of a dominant seventh sit six half steps apart, and each one is a half step from a note of the tonic chord.`,

    normal: `Two of the four notes in a dominant seventh do nearly all the work, and they
      are the third and the seventh. Those two sit six half steps apart, and each has one
      half step to travel before it reaches a note of the tonic chord. Play the pair on
      its own and it already sounds like an ending waiting to happen. Add the root and the
      fifth and you have coloured it in. Musicians call the pair the guide tones, and once
      you can find them you can work out where any dominant chord is going without
      thinking about the other two notes at all.`,

    deep: `Treat the pair as an object in its own right and something useful falls out.
      Six half steps apart, moving a half step each in opposite directions, the two notes
      land a major third apart. That third is the root and the third of the tonic chord,
      which happens to be the pair that tells major from minor and names the chord
      outright. Meanwhile the root and the fifth of the dominant have done nothing
      interesting: one of them already belongs to the tonic chord and the other can go
      either way without anybody minding. So the disposable parts of a dominant seventh
      are the ones that sound most like a chord, and the parts carrying the meaning are
      the two that sound least settled on their own. A rhythm section is built on that
      division of labour. The pianist plays two notes, the bass player supplies a root,
      and nobody has to play anything resembling a full chord for the harmony to be
      unmistakable.`,

    nerd: `The tritone is the one interval that inverts to itself, and the symmetry has
      consequences. Turn the pair upside down and the two notes now look like the third
      and seventh of a different dominant seventh, one whose root sits a tritone away from
      the first. Both chords hold the same two notes with the roles exchanged, so both can
      aim at the same target, and jazz players make a substitution out of it. A second
      point, less often admitted: the leaning is a convention rather than a fact about
      air. Twelve-bar blues puts a dominant seventh on the first degree of the key and
      resolves it nowhere, because the style has agreed the chord is stable, and nobody
      hears an unpaid debt. Spelling has an edge too. The same sound is an augmented
      fourth in some contexts and a diminished fifth in others, and which one gets written
      depends on which note is heading up and which is heading down, so the spelling
      records an intention rather than a distance.`,
  },

  steps: {
    why: {
      text: `A dominant seventh gets described as tense, and tense is not information. Point
        at the two notes doing it, say where each of them is going, and the chord becomes
        something you can predict instead of something you have to feel. Four notes go in.
        Two of them are load bearing.`,
    },

    hear: {
      text: `The fourth and seventh degrees of your key, sounded together. Neither one
        belongs to the tonic chord. Each of them sits a single half step from a note that
        does.`,
      example: { kind: 'stack', intervals: ['P4', 'M7'] },
      playback: 'chord',
    },

    see: {
      text: `On the ring the two notes sit directly opposite each other, which is what six
        half steps looks like. Written on the staff they are easy to find: the note a step
        below the tonic, and the note a step above the third degree. Both of those steps
        are half steps, which is the whole reason this works.`,
      example: { kind: 'stack', intervals: ['P4', 'M7'] },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'tritone-mirror',
        prompt: `Play the two notes together. Move the upper one up by a half step and the
          lower one down by a half step, then play the tonic chord and compare what you
          have.`,
        noticing: `The upper note lands on the tonic and the lower one lands on the third
          degree. Two half steps taken in opposite directions, and what is left is two
          thirds of the home chord. Flip the pair over and the gap is still six half steps,
          which is why this interval has no upside down.`,
        views: ['pitchring', 'piano', 'staff'],
        labelMode: 'degree',
        controls: ['play', 'compare', 'invert', 'reveal', 'reset'],
        example: { kind: 'stack', intervals: ['P4', 'M7'] },
      },
    },

    name: {
      term: 'Guide tones',
      text: `The third and the seventh of a seventh chord, taken as a pair. In a dominant
        seventh they are six half steps apart and each has one half step to travel: the
        third climbs to the tonic, the seventh drops to the third degree. Everything else
        in the chord is confirmation.`,
      symbol: '3rd ↑, ♭7th ↓',
      alsoCalled: ['guide tone pair', 'tendency tones', 'the tritone of the key'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Here is a four-note chord. Name the two notes in it that are six half
          steps apart.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['dom7', 'major', 'min7', 'half-dim7'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 3,
        feedback: `Measure from the chord's third up to its seventh. Several of these have
          no tritone anywhere in them, and saying so is the right answer rather than a
          failure to find one.`,
      },
    },

    apply: {
      text: `Arrangers lean on this constantly. A guitarist comping behind a singer will
        often play two notes and let the bass have the root, and a horn section writing a
        two-part backing picks these two before any others, because they carry the harmony
        and nothing else has to.`,
      task: `Play the two notes below on their own, then move each of them a half step
        toward the tonic chord. Hum the tonic underneath if you can. The ending is there
        with two notes and no chord.`,
      example: { kind: 'stack', intervals: ['P4', 'M7'] },
    },

    challenge: {
      drill: {
        kind: 'multiple-choice',
        prompt: `For each chord, say which note the seventh has to fall to and which note
          the third has to rise to.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['dom7', 'dim7', 'half-dim7'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `Half steps both times, in opposite directions. Watch the diminished
          sevenths: they hold two tritones rather than one, so they have two answers, and
          that ambiguity is exactly what makes them useful.`,
      },
    },

    review: {
      takeaways: [
        `The third and seventh of a dominant seventh are the two notes that make it a dominant.`,
        `The third rises a half step onto the tonic, and the seventh falls a half step onto the third degree.`,
        `Those two notes on their own spell the resolution, which is why they are called guide tones.`,
      ],
      next: `Two lines is the smallest version of the idea. A chord has four, and routing
        all four is a craft with habits of its own.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L3 = defineLesson({
  id: 'w5-l3-voice-leading',
  world: 5,
  index: 4,
  minutes: 7,
  title: 'Move as Little as Possible',
  subtitle: 'Voice leading, common tones and half steps',
  teaches: ['voice-leading'],
  requires: ['harmonic-function', 'interval-inversion'],

  depths: {
    quick: `Voice leading is the craft of getting from one chord to the next by moving each note the smallest distance it can get away with.`,

    normal: `A chord change is not one object turning into another. It is three or four
      separate notes each going somewhere, and how you route them is most of what makes a
      progression sound smooth or clumsy. Two habits do the heavy lifting. If both chords
      contain the same note, hold it where it is. When a note has to move, move it a step
      rather than a leap. A progression that follows those two rules sounds professional
      before you have made a single interesting decision.`,

    deep: `The dominant seventh to tonic move is the model case, and it is worth taking
      apart note by note. Its root is also the fifth of the tonic chord, so it does not
      have to move at all. Above that, the third of the dominant is the seventh degree of
      the key, a half step below the tonic, so it goes up by one. And the chord's own
      seventh is the fourth degree, a half step above the third of the tonic, so it goes
      down by one. That leaves the fifth of the dominant, which drops a whole step.
      Nothing has travelled further than a whole step, the four lines cover four half
      steps between them, and that economy is why the progression sounds inevitable rather
      than merely correct. Real bass parts are the exception and leap on purpose, so the
      root of each chord stays unmistakable. Behind all of it is a practical reason. Music
      of this kind was written for singers, and a line that steps is far easier to hold on
      to than a line that leaps.`,

    nerd: `Smallest motion is a default, not a law, and there are three well-known places
      it is deliberately broken. A bass line usually leaps, because the bass is heard as
      the foundation rather than as a melody and a leaping bass makes the root of each
      chord unmistakable. Parallel perfect fifths and octaves between two voices are
      avoided in common-practice writing not because they are large moves but because they
      are too smooth: two voices a fifth apart moving in the same direction stop sounding
      like two voices at all. And a voice will happily leap when the alternative is a
      doubled leading tone, which is one of the few places the rules actively conflict.
      Worth knowing too: on a guitar or a keyboard, voice leading is usually what people
      are talking about when they say a chord shape sounds better in one inversion than
      another. The notes are the same. Only the distances travelled differ.`,
  },

  steps: {
    why: {
      text: `Two people can play the same four chords and one of them sounds like a chart
        being read out while the other sounds like music. The difference is almost never
        the chords. It is which note went where in between them.`,
    },

    hear: {
      text: `The dominant seventh spread out, then the tonic chord after it, one note at a
        time. Follow one note across the change. Listening to the chords as lumps will not
        show you anything.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11, 8, 10, 12] },
      playback: 'sequence',
    },

    see: {
      text: `The two chords on the staff with their note names showing. One letter appears
        in both groups. Played as blocks, that is the note which never has to move at all.
        Two more letters sit a half step from a letter in the other group, and the one left
        over moves a whole step. Nothing here travels further than that.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11, 8, 10, 12] },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Play the dominant seventh, then find a way to play the tonic chord that
          keeps your hand as still as possible. Then deliberately play the worst version
          you can, jumping every finger.`,
        noticing: `The still version and the jumping version contain exactly the same
          notes. They do not sound the same. Only the still one sounds like the two chords
          belong to each other.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'name',
        controls: ['play', 'compare', 'octave-shift', 'tonic-picker', 'reset'],
        example: { kind: 'chord', chordId: 'dom7', rootInterval: 'P5' },
      },
    },

    name: {
      term: 'Voice leading',
      text: `Treating each note of a chord as a line that continues into the next chord,
        and routing those lines to travel as little as possible. A note present in both
        chords is a common tone. Hold it. Anything that has to move should move by a step,
        and by a half step where one is available.`,
      alsoCalled: ['part writing', 'voicing', 'part movement'],
    },

    practice: {
      drill: {
        kind: 'multiple-choice',
        prompt: `Same two chords every time, several ways of arranging the second one.
          Pick the arrangement that moves the fewest notes the shortest distance.`,
        reps: 10,
        asks: 'invert',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        views: ['piano', 'staff'],
        labelMode: 'name',
        difficulty: 2,
        feedback: `Count the notes that stayed put first. The arrangement with the most
          held notes is nearly always the winner.`,
      },
    },

    apply: {
      text: `This is the difference between a chord chart and an arrangement. Guitarists
        meet it as the choice between the shape they know and the shape near where their
        hand already is; pianists meet it as inversions.`,
      task: `Play the tonic triad below with the fifth on top. Now play the dominant
        seventh underneath it without letting that top note move. It will not need to.`,
      example: { kind: 'chord', chordId: 'major' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Two chords on the staff. Name the note they share, then name the note
          that has to move by a half step.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['dom7', 'major', 'minor'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 3,
        feedback: `Some pairs share nothing at all, and that is a real answer rather than a
          trick. Two triads a step apart have no common tones. Those are the pairs that
          need the most care, because every line in them has to move.`,
      },
    },

    review: {
      takeaways: [
        `Hold common tones, move everything else by the smallest step available.`,
        `The dominant seventh to tonic move covers four half steps across four lines.`,
        `Smallest motion is the default; bass lines and parallel fifths are the standard exceptions.`,
      ],
      next: `Everything so far has stayed inside the key. One note from outside it buys
        more than you would expect.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L7 = defineLesson({
  id: 'w5-l7-common-tones',
  world: 5,
  index: 5,
  minutes: 6,
  title: 'Hold What You Can',
  subtitle: 'Common tones, half steps, and what a chord change actually costs',
  teaches: ['voice-leading'],
  requires: ['voice-leading', 'harmonic-function'],

  depths: {
    quick: `Two triads from one key share two notes if their roots are a third apart, one if a fifth apart, and nothing if they are a step apart.`,

    normal: `Before you play a chord change you can already know how much work it is going
      to be. Count what the two chords have in common. Roots a third or a sixth apart give
      you two shared notes, so a single voice moves and it moves by a step. A fourth or a
      fifth between the roots leaves one shared note, and two voices have a step each to
      walk. Put the roots a step apart and you get nothing whatsoever, so every voice has
      to go somewhere. That last case is the one worth preparing for.`,

    deep: `The rule behind the count is simpler than the count. A triad is three notes
      taken from the scale by skipping every other one, so two triads overlap wherever
      their stacks land on the same degrees. Move a root up by a third and two of the
      three notes survive into the new stack, because the pattern has only shifted along
      by one place. A root a fifth away leaves exactly one survivor. Roots a step apart
      interlock without touching, which is why the chords on the first and second degrees
      have not a single note in common. When nothing is shared, the working answer is
      contrary motion: send the bass one way and the upper voices the other, and the
      change reads as deliberate rather than clumsy. Half steps are the other half of the
      craft. Given a choice between a half step and a whole step, take the half step,
      because the smaller the move the more the two chords sound like one thing continuing
      instead of two things in a row.`,

    nerd: `The counting rule as stated holds for triads cut from the same seven-note
      collection, and it stops holding the moment a chord comes from outside the key. C
      major against E major has roots a third apart and one note in common rather than
      two, since the second chord's third and fifth have both been raised. Bear in mind as
      well that counting common tones is a starting point and not a target. Three shared
      notes means the harmony has barely moved, which is sometimes exactly wrong: a phrase
      that needs to arrive somewhere is better served by a change with fewer. Pairs with no
      common tones at all are the ones common-practice writing handles most carefully,
      since three voices all moving the same direction at once is how parallel fifths and
      octaves get written by accident. Four-part texture adds a wrinkle, because one note
      of the triad has to be doubled and the count depends on which note you doubled.
      Seventh chords change the picture outright. Two of them a fifth apart share two
      notes rather than one, which is a large part of why chains of sevenths sound so
      smooth, and most of why jazz harmony is built out of them.`,
  },

  steps: {
    why: {
      text: `Some chord changes take care of themselves and others sound like a stumble,
        and the difference is settled before you play a note. It comes down to how many
        notes the two chords already have in common, which is something you can count on
        your fingers.`,
    },

    hear: {
      text: `The tonic chord, then the chord on the sixth degree, one note at a time. Six
        notes go past. Only four different letters do.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 6, 8, 10] },
      playback: 'sequence',
    },

    see: {
      text: `Written out, two letters appear in both groups and the remaining one moves by
        a step. That is the cheapest change the key offers, and the cost is visible on the
        page before you have heard anything.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5, 6, 8, 10] },
      views: ['staff', 'piano'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'step-walker',
        prompt: `Play the tonic chord. Now play the chord on the sixth degree, then the one
          on the fourth, then the one on the second, counting each time how many notes had
          to move and how far each one went.`,
        noticing: `The sixth degree costs one move of a step. Going to the fourth degree
          costs two. Reaching the second degree costs three, with nothing to hold on to,
          which is why that change needs a plan and the other two do not.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'name',
        controls: ['play', 'compare', 'direction', 'octave-shift', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 3, 5] },
      },
    },

    name: {
      term: 'Common tone',
      text: `A note belonging to both of two consecutive chords. Held rather than replayed,
        it stitches the change together. Inside one key, roots a third or a sixth apart
        share two of them, roots a fourth or a fifth apart share one, and roots a step
        apart share none.`,
      symbol: 'I → vi: two held',
      alsoCalled: ['shared tone', 'held note', 'retained tone'],
    },

    practice: {
      drill: {
        kind: 'identify',
        prompt: `Two triads. Name every note they have in common, and answer none where
          that is the truth.`,
        reps: 10,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        difficulty: 2,
        feedback: `Compare letters before you compare anything else. Two triads whose roots
          are a step apart never share a note, so you can answer those without looking.`,
      },
    },

    apply: {
      text: `Guitarists meet this as the question of which shape to reach for and pianists
        as which inversion to land in. Arrangers meet it as the reason a chord change under
        a long held vocal note does not disturb the singer: the note being held is a common
        tone, and the harmony moved underneath it.`,
      task: `Play the tonic chord with its root on top. Now play the chord on the sixth
        degree, then the one on the fourth, keeping that top note exactly where it is.
        Neither chord needs it to move.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M6' },
    },

    challenge: {
      drill: {
        kind: 'order',
        prompt: `Put these chord changes in order of how much movement they need, least
          first.`,
        reps: 8,
        asks: 'step-size',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'diminished', 'dom7'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `Count shared notes first, then count how far the rest have to travel.
          The seventh chords here break the tidy version, since two of them a fifth apart
          share two notes and not one.`,
      },
    },

    review: {
      takeaways: [
        `A note in both chords is a common tone, and holding it is most of what makes a change sound smooth.`,
        `Roots a third apart share two notes, a fifth apart share one, a step apart share none.`,
        `With nothing shared, move the voices in opposite directions rather than all the same way.`,
      ],
      next: `Three chords picked by exactly this arithmetic give you the progression you
        have heard more often than any other.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L8 = defineLesson({
  id: 'w5-l8-two-five-one',
  world: 5,
  index: 6,
  minutes: 7,
  title: 'The Shortest Way Home',
  subtitle: 'Deriving ii V I instead of being handed it',
  teaches: ['harmonic-function'],
  requires: ['voice-leading', 'seventh-chord'],

  depths: {
    quick: `Ask for the predominant that shares the most with the dominant and the key hands you the chord on the second degree.`,

    normal: `You want to finish on the tonic. Whatever comes immediately before it should be
      the dominant, since that is the only chord in the key carrying the tritone. In front
      of the dominant goes a predominant, and the key offers two candidates: the chords on
      the second and fourth degrees. Take the second. Its root sits a fifth above the
      dominant's root, so the bass falls by fifths twice running, and built as seventh
      chords the two share half their notes. Second degree, fifth degree, first. Nothing
      about that was arbitrary.`,

    deep: `The join between the first two chords is worth taking apart note by note. Build
      the second-degree chord with a seventh on it and two of its four notes are already
      sitting in the dominant seventh: its root and its third turn up there as the fifth
      and the seventh. A third note has one half step to travel, because the seventh of
      the second-degree chord sits directly above the third of the dominant and drops onto
      it. Exactly the same thing happens at the next change, where the seventh of the
      dominant sits directly above the third of the tonic chord and drops onto that. Two
      chord changes, and each is a seventh falling a half step onto a third. Meanwhile the
      roots go down a fifth each time, which is the strongest root motion available and
      the same motion the dominant uses to get home. What you have is one gesture repeated,
      which is most of why the three chords sound finished rather than assembled.`,

    nerd: `Two honest caveats. The first is about reach: this is the backbone of jazz
      standards and very common in common-practice writing, and it is close to absent from
      an enormous amount of music that arrives perfectly well without it. Modal rock, most
      folk and a good deal of film scoring get home on a flattened seventh or a
      fourth-degree chord and never touch a ii V. Calling it the most common progression
      in Western music is a claim about particular repertoires rather than about the
      language. The second caveat is that the fourth degree is a genuine alternative and
      not a worse one. It shares two notes with the second-degree chord, its bass steps
      rather than leaps, and popular music prefers it by a wide margin. Running the same
      derivation in minor gives you a half-diminished chord on the second degree, and a
      dominant that needs its third raised by hand, since natural minor puts a minor chord
      on the fifth degree with no leading tone anywhere in it.`,
  },

  steps: {
    why: {
      text: `Every book on harmony prints this progression in bold and most of them simply
        assert it. Derived instead, it takes about a minute, and it is far more use that
        way, because the same reasoning builds progressions the book never got round to
        listing.`,
    },

    hear: {
      text: `Three notes: the roots of the three chords, in order. Each sits a fourth above
        the last, which is the same distance as a fifth below it. That shape is the sound
        of a bass line walking home.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [2, 5, 8] },
      playback: 'sequence',
    },

    see: {
      text: `On the ring, the two arcs are the same size. Root motion by a fifth is the move
        the dominant already makes into the tonic, and the chord on the second degree is
        doing it one step earlier.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [2, 5, 8] },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'keyboard-explorer',
        prompt: `Build the seventh chord on the second degree, then the one on the fifth.
          Find the two notes they share. Then hunt for the note in the first chord that
          sits one half step above a note in the second.`,
        noticing: `Two notes belong to both chords and never have to move. One more has a
          single half step to go, and it lands on the dominant's third. The last voice
          moves a whole step, and that is the widest thing that happens anywhere in the
          progression.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'name',
        controls: ['play', 'compare', 'tonic-picker', 'octave-shift', 'reset'],
        example: { kind: 'chord', chordId: 'min7', rootInterval: 'M2' },
      },
    },

    name: {
      term: 'The ii V I',
      text: `The chord on the second degree, then the one on the fifth, then the tonic.
        Written as numerals that is ii V I in major, and in minor the first chord comes out
        half-diminished. Musicians say the three numbers as one word and use the whole
        thing as a single unit.`,
      symbol: 'ii7 → V7 → I',
      alsoCalled: ['two five one', 'the two five', 'a ii V'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `Given the key, build the three chords of a ii V I with sevenths on all of
          them.`,
        reps: 10,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['min7', 'dom7', 'maj7'] },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        difficulty: 3,
        feedback: `Stack thirds from the degree you are standing on and read off whatever
          you got. A second-degree chord that comes out major, or a fifth-degree chord
          without a flat seventh, means a note from outside the key crept in.`,
      },
    },

    apply: {
      text: `Jazz standards are largely chains of these aimed at one target after another,
        which is why a player who can handle a ii V in all twelve keys can sight-read most
        of the repertoire. Pop swaps the second degree for the fourth and keeps the rest.`,
      task: `Play the seventh chord on the second degree, then the one on the fifth, then
        the tonic. Keep the top note of your right hand as still as you can manage. It
        should move twice, a half step each time, and end where it started.`,
      example: { kind: 'chord', chordId: 'min7', rootInterval: 'M2' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Somewhere in each chain of chords there is a ii V I. Name the chord that
          starts it.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['min7', 'dom7', 'maj7', 'half-dim7'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `Find the dominant seventh first and work backwards from it. Some of
          these chains are in minor, where the chord on the second degree is
          half-diminished and looks nothing like the one you have been building.`,
      },
    },

    review: {
      takeaways: [
        `The dominant goes immediately before the tonic because it is the chord holding the tritone.`,
        `The second degree wins the predominant slot on root motion and on shared notes.`,
        `Each chord's seventh falls a half step onto the next chord's third.`,
        `It is an idiom belonging to particular repertoires, not a law that music obeys.`,
      ],
      next: `A progression can build every bit of that expectation and then put a different
        chord where home was meant to be.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L9 = defineLesson({
  id: 'w5-l9-deceptive-resolution',
  world: 5,
  index: 7,
  minutes: 6,
  title: 'Everything Except the Arrival',
  subtitle: 'Deceptive resolution, and what it does to a phrase',
  teaches: ['cadence'],
  requires: ['cadence', 'voice-leading'],

  depths: {
    quick: `A deceptive ending lets the dominant discharge every bit of its tension and then swaps out the chord it was discharging into.`,

    normal: `Set an ending up properly and a listener commits to it before the last chord
      sounds. Go to the chord on the sixth degree instead of the tonic. Two of the notes
      land precisely where they were heading, so the tension genuinely does clear, while
      the bass steps up to a chord that cannot end anything. The phrase has been released
      and not closed, which leaves it no choice but to carry on.`,

    deep: `Take the two chords apart and the trick becomes visible. A dominant seventh
      resolving to the tonic sends its third up a half step onto the tonic note and its
      seventh down a half step onto the third degree. Both of those destinations belong to
      the chord on the sixth degree as well, because that chord is built out of the sixth
      degree, the tonic note and the third. So the guide tones resolve as they meant to and
      still find themselves inside a different chord. Only the bass does something else,
      moving up one step from the fifth degree to the sixth. One voice, going somewhere
      unremarkable, is the entire device. What makes it land is the size of the
      contradiction. Everything a listener uses as evidence of an ending happens on
      schedule, and the single thing that does not is a bass note one step away from the
      one it was supposed to be.`,

    nerd: `The name describes an expectation, and expectations are learned. Someone raised
      on music that does not use dominant to tonic endings hears nothing deceptive here at
      all, so the label is a fact about a tradition rather than about the chords. British
      writing calls it an interrupted cadence, which is arguably the better name, since
      nothing has been faked and something has genuinely been stopped. The category is
      open at the edges as well: analysts apply the word to any dominant that fails to
      reach the tonic, which takes in the flattened sixth degree in minor and the first
      inversion of the fourth-degree chord, so the real definition is "the dominant
      resolved somewhere else" and the sixth degree is only its commonest instance. One
      practical limit is worth knowing. Surprise is spent after a single use in the same
      spot, and a phrase that dodges twice in the same place stops sounding surprising and
      starts sounding like a tic.`,
  },

  steps: {
    why: {
      text: `A phrase that ends where you expect it to is finished, and sometimes finished
        is the last thing you want. There is a move that releases every bit of tension the
        dominant has built and still refuses to let the phrase close, and it costs exactly
        one note in the bass.`,
    },

    hear: {
      text: `The dominant seventh spread out, then the chord on the sixth degree. Listen for
        the moment the tension goes, then notice that the music has not stopped.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11, 6, 8, 10] },
      playback: 'sequence',
    },

    see: {
      text: `Look at the two notes in the first group that were leaning. Both of them arrive
        where they were always going, and both are inside the chord that turned up. What
        changed is the note underneath, which has moved one degree past the tonic.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11, 6, 8, 10] },
      views: ['staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'staff-plotter',
        prompt: `Plot the dominant seventh. Resolve it to the tonic chord and note where
          each voice landed. Now resolve the same chord to the sixth degree instead and
          compare the two results note by note.`,
        noticing: `Two of the voices land in the same place either way. Only the bass
          differs, and the bass turns out to be the voice carrying all the information
          about whether the phrase ended.`,
        views: ['staff', 'piano'],
        labelMode: 'degree',
        controls: ['play', 'compare', 'tonic-picker', 'reveal', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [5, 7, 9, 11] },
      },
    },

    name: {
      term: 'Deceptive resolution',
      text: `A dominant chord followed by something other than the tonic, most often the
        chord on the sixth degree. Tension resolves; arrival does not happen. Used to end a
        phrase it goes by deceptive cadence in American writing and interrupted cadence in
        British.`,
      symbol: 'V7 → vi',
      alsoCalled: ['deceptive cadence', 'interrupted cadence', 'evaded resolution'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `The same setup every time. Did the phrase land home, or somewhere next
          door?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        views: ['piano'],
        labelMode: 'none',
        difficulty: 3,
        feedback: `Hum the tonic under the final chord. If it fits and sounds like the
          bottom of the chord, you are home. Should it fit but sound like it is floating
          somewhere in the middle, you have been sidestepped.`,
      },
    },

    apply: {
      text: `Songwriters reach for this when a chorus wants another eight bars, and screen
        composers use it to hold a cue open over a scene that has not finished. Listen for
        it near the end of a verse that then keeps going.`,
      task: `Play the dominant seventh and go home. Do it again and go to the chord on the
        sixth degree instead. Now try to stop there. You will find that you cannot.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'M6' },
    },

    challenge: {
      drill: {
        kind: 'true-false',
        prompt: `Statements about how each phrase ended. Some of them confuse releasing
          tension with arriving.`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7', 'half-dim7'] },
        views: ['piano', 'staff'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `Those are two separate events, and a deceptive ending does the first
          without the second. Any statement treating them as one thing is the one to
          catch.`,
      },
    },

    review: {
      takeaways: [
        `A deceptive ending resolves the tritone and lands on the sixth degree instead of the tonic.`,
        `Only the bass does anything unexpected, which is why the ear gets caught out.`,
        `Deceptive is a claim about what a listener expected, so it describes a tradition rather than a chord.`,
      ],
      next: `A phrase that will not stop has to go somewhere, and most often it goes back to
        the beginning.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L10 = defineLesson({
  id: 'w5-l10-turnarounds',
  world: 5,
  index: 8,
  minutes: 6,
  title: 'Getting Back to the Top',
  subtitle: 'Turnarounds, and the last bar before a repeat',
  teaches: ['cadence'],
  requires: ['cadence', 'harmonic-function'],

  depths: {
    quick: `A turnaround is a short run of chords at the end of a section whose job is to leave home and hand you back to the dominant.`,

    normal: `Music repeats, and a section that ends on the tonic and then starts again on
      the tonic has a flat spot in the middle of the loop. Nothing is pulling. Fill the
      last bar or two with chords that walk away from home and finish on the dominant, and
      the repeat arrives under tension rather than by default. The standard shape runs
      tonic, sixth degree, second degree, fifth degree, and then round again.`,

    deep: `Every move in that shape is one you can already account for. Going from the tonic
      chord to the one on the sixth degree costs almost nothing, since the two share two
      notes, so the loop gets out of home without any sense of effort. From there the
      roots fall by a fifth three times running: sixth to second, second to fifth, fifth
      back to first. That is the resolving motion of a dominant, run three times over, and
      it is what makes the last bar feel pulled rather than pushed. Notice the
      relationship with the previous lesson. A dominant going to the sixth degree instead
      of the tonic lands you on the chord a turnaround starts from, so a deceptive ending
      and a turnaround are very often the same two bars described from opposite ends.`,

    nerd: `Turnaround is a blues and jazz word. Classical writing mostly does not name the
      thing at all, treating the same bars as a retransition or simply as harmony leading
      back. In a twelve-bar blues it occupies bars eleven and twelve and can be as little
      as the dominant chord sitting there on its own. Substitutions pile up here more than
      anywhere else in a form, because the two bars are short, everyone knows what they
      are for, and little is lost if a listener misses the detail: the sixth-degree chord
      routinely turns major so that it points at the second degree, the second degree gets
      swapped for a chord a tritone from the dominant, and chromatic passing chords fill
      whatever gaps are left. Worth noticing as well that the same four chords read as a
      cadence or as a turnaround depending only on where the phrase boundary falls. The
      chords carry no information about that at all. Rhythm and form do.`,
  },

  steps: {
    why: {
      text: `Loops are everywhere in music, and a loop has one weak point: the seam where
        the end meets the beginning. Play the last bar as a plain tonic chord and the
        repeat happens because the page says so. Fill that bar properly and the repeat
        happens because the harmony insisted on it.`,
    },

    hear: {
      text: `Four chord roots and then the first one again. The opening move drops a third.
        Every move after it is a fall of a fifth, three times over.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 2, 5, 1] },
      playback: 'sequence',
    },

    see: {
      text: `On the ring the last three arcs are all the same size. Root motion by a fifth
        is what a dominant does to get home, and a turnaround is that motion started early
        and repeated until it arrives.`,
      example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 2, 5, 1] },
      views: ['pitchring', 'staff', 'piano'],
      labelMode: 'degree',
    },

    discover: {
      widget: {
        kind: 'interval-builder',
        prompt: `Play the four roots in order and measure each gap. Then measure the gap
          from the last one back to the first.`,
        noticing: `Three of the four gaps are the same interval, a fifth, and the odd one
          out is the first. That first move is the cheap one, because the two chords
          involved share two of their three notes.`,
        views: ['pitchring', 'staff', 'piano'],
        labelMode: 'interval',
        controls: ['play', 'compare', 'tonic-picker', 'label-mode', 'reset'],
        example: { kind: 'degrees', scaleId: 'major', degrees: [1, 6, 2, 5] },
      },
    },

    name: {
      term: 'Turnaround',
      text: `A short group of chords at the end of a section that leaves the tonic and
        delivers you to the dominant, so the repeat begins under tension. The usual version
        uses the chords on degrees one, six, two and five. A cadence closes a phrase; a
        turnaround declines to.`,
      symbol: 'I vi ii V',
      alsoCalled: ['turnback', 'retransition', 'the last two bars'],
    },

    practice: {
      drill: {
        kind: 'order',
        prompt: `Four chords from your key. Put them in the order that walks from home to
          the dominant.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        views: ['staff', 'piano'],
        labelMode: 'degree',
        difficulty: 3,
        feedback: `Work backwards from the dominant. Whatever precedes it wants a root a
          fifth above the dominant's root, and whatever precedes that wants to share notes
          with the tonic chord.`,
      },
    },

    apply: {
      text: `Twelve-bar blues has one in bars eleven and twelve, jazz standards have one at
        the end of nearly every chorus, and a great deal of pop is a four-chord turnaround
        with no cadence anywhere in the song.`,
      task: `Play the tonic chord, then the sixth degree, then the second, then the fifth,
        then start again on the tonic. Go round four times without stopping. Now play four
        bars of the tonic chord instead and hear the loop sag.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'P5' },
    },

    challenge: {
      drill: {
        kind: 'multiple-choice',
        prompt: `The same four chords twice. Once they end a phrase and once they set up a
          repeat. Say which is which.`,
        reps: 8,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor', 'dom7'] },
        views: ['piano', 'staff'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `The chords are identical, so they cannot be the evidence. Listen for
          where the phrase breathes and which chord the following bar starts on.`,
      },
    },

    review: {
      takeaways: [
        `A turnaround fills the seam in a loop so the repeat arrives with tension behind it.`,
        `Its root motion is one cheap move off the tonic followed by falls of a fifth.`,
        `The same four chords read as a cadence or a turnaround depending on where the phrase ends.`,
        `The word belongs to blues and jazz; classical writing describes the same bars differently.`,
      ],
      next: `One chord in that loop can be aimed at a target it does not belong to, and the
        whole trick costs a single note from outside the key.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L4 = defineLesson({
  id: 'w5-l4-secondary-dominants',
  world: 5,
  index: 9,
  minutes: 8,
  title: 'Borrowing a Dominant',
  subtitle: 'Secondary dominants, and why one accidental goes so far',
  teaches: ['secondary-dominant'],
  requires: ['cadence', 'voice-leading'],

  depths: {
    quick: `Put a chord's own dominant seventh in front of it and that chord sounds like home for a moment, even though it is not.`,

    normal: `A key gives you one dominant chord, on the fifth degree, pointing at the
      tonic. Nothing stops you building the same kind of chord pointing at any other chord
      in the key. Take the chord you want to spotlight, find the note a fifth above it,
      build a dominant seventh there and play it first. The target now arrives like an
      ending. One note has changed and the progression has a whole extra gear.`,

    deep: `The mechanism is the tritone again, imported. A dominant seventh built a fifth
      above any chord contains a tritone whose two notes each sit a half step from a note
      of that chord. One leans up into the target's root, the other leans down into its
      third, so the chord resolves into its target exactly the way the ordinary dominant
      resolves into the tonic. The ear is not fussy about which key it thinks it is in for
      one beat. It hears the tension, it hears where the tension goes, and it takes the
      target for home as long as that lasts. The cost is almost nothing. Aiming at the
      chord on the fifth degree means raising the third of the chord on the second degree
      and changing nothing else. One accidental. That is why this is the first piece of
      chromatic harmony worth learning: the altered note always sits a half step below the
      note it is heading for, so the voice leading writes itself.`,

    nerd: `Two ragged edges. The dominant of the fourth degree comes out as a dominant
      seventh built on the tonic itself, which means adding a flat seventh to the home
      chord turns it into a chord that points away from home. Blues and gospel do this
      constantly, so much so that in those styles the tonic seventh has stopped implying
      any motion at all. The other edge is the chord on the seventh degree. It is
      diminished, it never sounds like an arrival, and nothing is spent tonicising a chord
      nobody arrives at. The related device you will meet instead is the secondary
      leading-tone chord, which aims at the same targets from a half step below rather than
      a fifth above. Notation is worth watching too. A dominant seventh aimed at the chord
      on the fifth degree is written V7/V and read aloud as "five seven of five". What sits
      under the slash is a Roman numeral, not a bass note. Anyone arriving from lead sheets
      trips on that exactly once.`,
  },

  steps: {
    why: {
      text: `Diatonic harmony gives you seven chords and after a while they all sound like
        each other. One chord from outside the key, placed correctly, makes a chord you
        have already heard forty times sound like an event. It costs a single accidental.`,
    },

    hear: {
      text: `A dominant seventh built on the second degree of the key. It contains a note
        that does not belong to the key at all, and it is aiming at the chord a fifth below
        it rather than at the tonic.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'M2' },
      playback: 'chord',
    },

    see: {
      text: `The intruder is easy to spot on the staff: it is the note carrying the
        accidental, sitting a half step below the note it wants to reach. On the ring, the
        chord's tritone points at a pair of notes that are not the tonic and its third.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'M2' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'accidental-lab',
        prompt: `Start from the ordinary minor seventh chord on the second degree. Raise
          its third by one half step, play it, then play the chord on the fifth degree
          after it.`,
        noticing: `One raised note converts a mild predominant into a chord that points
          somewhere with real force. The raised note is a half step below the root of the
          chord it is pointing at, which is exactly what a leading tone does.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'name',
        controls: ['accidental-step', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'chord', chordId: 'min7', rootInterval: 'M2' },
      },
    },

    name: {
      term: 'Secondary dominant',
      text: `A dominant seventh built a fifth above a chord that is not the tonic, used
        to make that chord sound like an arrival. The notation is a fraction, read as "of".
        V7/V is the dominant of the dominant, and V7/vi the dominant of the sixth degree.
        Whatever it points at is called the target, or the tonicised chord.`,
      symbol: 'V7/V',
      alsoCalled: ['applied dominant', 'five of five', 'tonicisation'],
    },

    practice: {
      drill: {
        kind: 'build',
        prompt: `Here is a target chord. Build the dominant seventh that points at it.`,
        reps: 10,
        asks: 'construct',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['dom7'] },
        views: ['staff', 'piano'],
        labelMode: 'name',
        difficulty: 3,
        feedback: `Go up a fifth from the target and build a major triad with a flat
          seventh on it. If the third of your chord is not a half step below the target's
          root, something has gone wrong.`,
      },
    },

    apply: {
      text: `Listen for this in almost any song with a bridge. The chord on the sixth
        degree preceded by its own dominant is the single most common example, and it is
        what makes a minor chord in a major key sound temporarily like the centre of the
        world.`,
      task: `Play the chord below, which is the dominant of the sixth degree, then play the
        chord on the sixth degree after it. Then play the sixth degree chord on its own.
        The second version sounds like nothing much happened.`,
      example: { kind: 'chord', chordId: 'dom7', rootInterval: 'M3' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `One note in each chord is from outside the key. Name it, and say which
          chord it is leaning toward.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['dom7', 'major', 'min7'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `Some of these have no intruder and are ordinary diatonic chords, which
          is the point. A raised note nearly always resolves up by a half step. Follow it.`,
      },
    },

    review: {
      takeaways: [
        `A secondary dominant is a dominant seventh aimed at a chord other than the tonic.`,
        `It works because it imports a tritone that resolves into the target.`,
        `Usually it costs one accidental, and that accidental is a leading tone for the target.`,
      ],
      next: `Chromatic notes can also come from the parallel key rather than from a chord
        pointing somewhere. That is the last idea in this world.`,
    },
  },
});

// ---------------------------------------------------------------------------

const L5 = defineLesson({
  id: 'w5-l5-borrowed-chords',
  world: 5,
  index: 10,
  minutes: 7,
  title: 'Chords From the Other Version',
  subtitle: 'Borrowed chords and modal mixture',
  teaches: ['borrowed-chords'],
  requires: ['secondary-dominant', 'harmonic-function'],

  depths: {
    quick: `A borrowed chord is one taken from the minor key with the same tonic, dropped into a major key for the colour it brings.`,

    normal: `Every major key has a minor key sitting on the same tonic, with three of its
      notes lowered. You are allowed to reach across and take chords from it. The most
      common theft by a wide margin is the minor chord on the fourth degree, used where the
      major one would normally go. It has a bittersweet quality that a major key cannot
      produce on its own, and it is everywhere once you start listening for it.`,

    deep: `Borrowing works because the tonic does not change. The key sounds the same
      distance from home before and after, so the listener's bearings survive, and the only
      thing that shifts is the shade. That is why this move feels like a change of light
      rather than a change of place, and why it is much less disruptive than actually
      changing key. The candidates all come from lowering the third, sixth or seventh
      degree: the minor chord on the fourth degree, the major chords on the flattened
      sixth and flattened seventh, and the half-diminished chord on the second degree,
      which is the standard predominant in minor and sounds noticeably darker than the
      minor seventh it replaces. Note the direction is reversible. A piece in minor that
      ends on a major tonic chord has borrowed the other way, an ending old enough to have
      its own name.`,

    nerd: `"Borrowed" is a metaphor, and a slightly misleading one: nothing is returned,
      and the chord usually behaves exactly as its function says it should. Modal mixture
      is the more accurate term. Jazz and pop musicians tend to say modal interchange, and
      they push the idea well past the parallel minor, taking chords from any mode built on
      the same tonic. On that reasoning the major chord on the second
      degree gets called a loan from Lydian, since its third is the raised fourth degree
      that mode is known by. Spelling deserves care here. Take the minor chord on the
      fourth degree of G♭ major: its third needs a double flat, which looks alarming and
      is correct. A chord is a root, some kind of third and some kind of fifth, and the
      letters are not negotiable. One more thing worth knowing. The major chord on the
      flattened sixth degree has a second life as the starting point for an augmented
      sixth chord, which is where mixture stops being a colour and starts being a
      mechanism.`,
  },

  steps: {
    why: {
      text: `Major keys have a limited emotional range on their own, and pieces that never
        leave one can start to sound like an advert. A chord from the parallel minor adds
        shade without moving the tonic anywhere, which makes it the cheapest colour
        available in tonal harmony.`,
    },

    hear: {
      text: `A minor chord built on the fourth degree of a major key. The key says that
        chord should be major. This is the same root with its third pulled down a half
        step, and the effect is out of all proportion to the size of the change.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'P4' },
      playback: 'chord',
    },

    see: {
      text: `On the staff, one note carries an accidental the key signature did not ask
        for. That lowered note is the sixth degree of the key, which is exactly what the
        parallel minor scale would have given you.`,
      example: { kind: 'chord', chordId: 'minor', rootInterval: 'P4' },
      views: ['staff', 'piano', 'pitchring'],
      labelMode: 'name',
    },

    discover: {
      widget: {
        kind: 'quality-shifter',
        prompt: `Play the major chord on the fourth degree, then lower its middle note by
          one half step and play it again. Follow each version with the tonic chord.`,
        noticing: `The borrowed version leans into the tonic harder, because its lowered
          note is now a half step above the fifth of the tonic chord instead of a whole
          step above. Colour and voice leading turn out to be the same fact.`,
        views: ['piano', 'staff', 'pitchring'],
        labelMode: 'name',
        controls: ['accidental-step', 'play', 'compare', 'label-mode', 'reset'],
        example: { kind: 'chord', chordId: 'major', rootInterval: 'P4' },
      },
    },

    name: {
      term: 'Borrowed chord',
      text: `A chord taken from the key with the same tonic and the opposite quality,
        used inside the original key. The usual suspects in a major key are the minor
        chord on the fourth degree, the major chords on the flattened sixth and flattened
        seventh, and the half-diminished chord on the second degree.`,
      symbol: 'iv in a major key',
      alsoCalled: ['modal mixture', 'mixture', 'modal interchange'],
    },

    practice: {
      drill: {
        kind: 'ear',
        prompt: `Fourth degree chord, played as a block. Major, or borrowed from the minor
          key?`,
        reps: 10,
        asks: 'same-different',
        mode: 'harmonic',
        pool: { kind: 'chord', ids: ['major', 'minor'] },
        views: ['piano'],
        labelMode: 'none',
        difficulty: 2,
        feedback: `Only the middle note differs. If the chord sounds like it has been
          shaded rather than brightened, it is the borrowed one.`,
      },
    },

    apply: {
      text: `The major chord on the flattened seventh degree is the other one worth having
        under your fingers straight away. It is not in the major key at all, it appears in
        an enormous amount of rock and film music, and it approaches the tonic from a whole
        step below rather than a half step, which is why it sounds broad instead of urgent.`,
      task: `Play the chord below, then the tonic. Compare it with the ordinary dominant to
        tonic ending. Both arrive, and only one of them sounds like a resolution.`,
      example: { kind: 'chord', chordId: 'major', rootInterval: 'm7' },
    },

    challenge: {
      drill: {
        kind: 'identify',
        prompt: `Each of these chords borrows exactly one note from the parallel minor key.
          Name the borrowed note.`,
        reps: 8,
        asks: 'note-name',
        mode: 'visual',
        pool: { kind: 'chord', ids: ['minor', 'major', 'half-dim7', 'dom7'] },
        views: ['staff', 'piano'],
        labelMode: 'none',
        difficulty: 4,
        feedback: `Three degrees get lowered in the parallel minor: the third, the sixth
          and the seventh. The borrowed note is always one of those three.`,
      },
    },

    review: {
      takeaways: [
        `Borrowed chords come from the key with the same tonic and the opposite quality.`,
        `The tonic stays put, so the ear reads it as a change of shade rather than a change of key.`,
        `The minor chord on the fourth degree is the one to learn first.`,
      ],
      next: `Function, cadence, voice leading and two ways out of the key. World 6 takes
        all of it away from the page and asks you to hear it.`,
    },
  },
});

// ---------------------------------------------------------------------------

export const WORLD_5 = defineWorld({
  id: 'world-5',
  number: 5,
  title: 'Progression Lab',
  tagline: 'Make harmony go somewhere',
  blurb: `Ten lessons on why chords move. Function first, sorted into three jobs and
    honest about where that sorting breaks down. Then the endings that punctuate a phrase,
    the two notes inside a dominant seventh that do the resolving, the small motions that
    make one chord slide into the next, the progression all of that adds up to, and the
    two chromatic moves that repay learning before any others. One interval, the tritone,
    runs through the lot.`,
  lessons: [L1, L2, L6, L3, L7, L8, L9, L10, L4, L5],
});

export default WORLD_5;
