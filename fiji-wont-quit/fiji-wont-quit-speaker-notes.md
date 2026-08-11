# Fiji Won't Quit: Scientific Infrastructure Is a Team Sport

*How shared ownership made Fiji a lasting cornerstone of biological image
analysis*

## Preparation note

Every chapter heading below is taken from, or shortened from, the title of
a scientific article that OpenAlex records as citing the principal Fiji
paper.[1] At the time these notes were prepared, the OpenAlex
`cites:W2167279371` query returned 70,813 works, including 53,161 records
classified as articles. Citation databases differ in coverage and document
typing, so this is a dated OpenAlex count rather than a universal total.

The bibliographic metadata in the references was checked against Crossref
on 2026-08-11. Before showing a paper as an example of a particular *use* of
Fiji, inspect its methods or reference context. The verified claim made by
these notes is that OpenAlex records the paper as citing Fiji, not that Fiji
necessarily produced every result described in its title.

For the chapter slides:

1. Show only the short article-title hook in large type.
2. Add `Actual title of an article citing Fiji` in small type.
3. Put the first author, year, and DOI in the footer.
4. Briefly respect what the cited paper actually studies before borrowing
   its title for the Fiji story.

## Opening device

### Slide

> One strange consequence of being cited tens of thousands of times is that
> eventually the scientific literature writes your presentation for you.

### Speaker notes

Every chapter heading in this talk is the title, or the opening part of the
title, of a real scientific article that cites Fiji.[1]

That is amusing, but it is also evidence of the central point of this talk:
Fiji escaped the intentions and disciplinary boundaries of the people who
started it. It became infrastructure that other people could use for
questions we never anticipated.

I can tell this history in the first person because I started Fiji. But I
cannot honestly tell it as a one-person story. Fiji became consequential
because many people helped to build it, support it, teach it, extend it,
maintain it, and eventually take responsibility for it.

---

## 1. Better late than never

*Article source: Womack, Christensen-Dalsgaard, and Hoke, 2016.[3]*

### Speaker notes

The article behind this title concerns the delayed maturation of effective
air-borne hearing in toads.[3] I am borrowing its opening words because this
is, remarkably, the first talk devoted to Fiji at this institute.

So: better late than never.

This is not a talk about a recent result. It is the story of how a project
became infrastructure, how infrastructure became a community, and how
something I started became something that many other people could sustain.

The usual lifetime-achievement story centers the person standing on the
stage. I want to tell a slightly different story. The achievement worth
celebrating is that Fiji no longer depends on the person standing on this
stage.

### Transition

To understand why Fiji was needed, we have to distinguish between having a
powerful program and having a usable scientific platform.

---

## 2. What You See versus What You Get

*Article source: Hakimian, Ivanov, and Worden, 2026.[4]*

### Speaker notes

ImageJ was already powerful, extensible, and extraordinarily important.[2]
Its plugin model allowed scientists and developers to add new capabilities.
That openness made Fiji possible.

But seeing what was possible was different from getting it to work
reliably.

A scientist might still have to:

- discover that the right plugin existed;
- locate a trustworthy download;
- copy a JAR file into the correct directory;
- resolve dependencies;
- determine which versions worked together;
- restart the application;
- learn whichever language or interface that particular tool expected;
- and then explain the entire procedure to the next laboratory.

The missing contribution was often not another image-processing algorithm.
It was the path between an algorithm and the scientist who needed it.

Fiji did not set out to replace ImageJ. It built on ImageJ and tried to make
its ecosystem easier to enter, use, extend, and share.[1,2]

### Point to land

> The final mile between a published method and a usable method is itself
> scientific infrastructure.

### Transition

For too much scientific software, installation was less a process than an
act of faith.

---

## 3. Plug & pray?

*Shortened from Opstad, 2022.[5]*

### Speaker notes

For a surprising amount of scientific software, installation meant copying
a file somewhere, restarting the application, and hoping.

Fiji tried to replace that hope with integration.[1]

The features are easiest to understand as barriers that Fiji tried to
remove:

- **Bundled plugins** made useful tools discoverable and gave people a
  working starting point.
- **Dependency management** made the collection behave more like a system
  and less like a pile of unrelated downloads.
- **The updater** allowed bug fixes and new capabilities to travel to users.
- **Update sites** allowed developers to distribute their own plugins
  without waiting for a central release.
- **The Script Editor** made automation visible and approachable.
- **Multiple scripting languages** respected knowledge people already had.
  A scientist who knew Python, JavaScript, Ruby, Clojure, BeanShell, or the
  ImageJ macro language should not have to learn a new language merely to
  automate image analysis.

None of these was a glamorous new segmentation algorithm. They were the
connective tissue that allowed algorithms to travel.

This is one of the broader lessons of Fiji: reducing friction is not
secondary work. When enough people encounter the same friction, removing it
becomes infrastructure.

### Point to land

> Fiji's most consequential feature may have been making other people's
> features usable.

### Transition

But integrated software does not emerge from code alone. It has to connect
different kinds of expertise.

---

## 4. It takes Two

*Shortened from Janeschik and colleagues, 2022.[6]*

### Speaker notes

Fiji had to connect at least two kinds of expertise:

1. people who understood biological questions, experimental practice, and
   what scientists actually needed;
2. people who understood software architecture, distribution, maintenance,
   and how to turn repeated local solutions into a platform.

Neither side could build something genuinely useful alone.

This is where I want Pavel Tomancak to be central to the story.

Today, with a citation record of this scale, supporting Fiji may look like
an obvious decision. Pavel supported it before that evidence existed. He is
an author of the principal Fiji paper,[1] and his later work continued to
advance openly shared imaging infrastructure, including OpenSPIM.[7]

**Insert one concrete Pavel story here.** The best story will have a moment,
a decision, and a consequence. For example:

- a biological problem that forced the software to become more useful;
- a moment when Pavel defended the value of infrastructure work;
- an introduction that brought an important contributor into the project;
- support for a workshop, sprint, publication, or collaboration;
- or an occasion when his confidence made it possible to continue.

Then say:

> What Pavel recognized was that enabling other scientists is not separate
> from science. It is a way to multiply science.

Of course, it soon took far more than two. Fiji required plugin authors,
algorithm developers, testers, documentation writers, teachers, workshop
organizers, bug reporters, institutional supporters, and users who became
contributors.

### Point to land

> The partnership between biology and software engineering started the
> platform. A much larger network made it matter.

### Transition

The next step was not merely to accumulate more tools. It was to make
participation possible at several levels.

---

## 5. Light-sheet microscopy for everyone?

*Article source: Girstmair and colleagues, including Pavel Tomancak,
2016.[7]*

### Speaker notes

The question mark matters. "For everyone" does not mean that difficult
science suddenly requires no expertise. It means that expertise can be
encoded, documented, distributed, taught, and improved collectively.

Fiji offered a ladder of participation:

1. Someone could begin by opening an image and selecting a command.
2. Later, that person could record or write a script.
3. The script could use a language the person already knew.
4. A local workflow could become a reusable plugin.
5. An update site could make that plugin available to other laboratories.
6. A user could answer a question, report a bug, improve documentation, or
   assume maintenance of a component.

The route from user to contributor did not require one enormous leap.

This is also a good place to show that Fiji belonged to a wider culture of
open microscopy. The OpenSPIM paper asks whether light-sheet microscopy can
be made available to everyone and includes Pavel among its authors.[7] The
same instinct is visible in Fiji: package expert work so that more people
can inspect it, use it, modify it, and pass it on.

### Point to land

> The community was not added after the software was finished. Much of the
> software was built to make community possible.

### Transition

Once a platform becomes genuinely reusable, people begin using it for
questions its creators could never have predicted.

---

## 6. The physics of dancing peanuts in beer

*Article source: Pereira and colleagues, 2023.[8]*

### Speaker notes

Pause here and let the title work.

The study examines the repeated floating and sinking of peanuts in
carbonated beer.[8]

I did not start Fiji because the world urgently needed to understand why
peanuts dance in beer.

That is precisely why this is such a good illustration of platform impact.
A platform is not successful merely when it answers the questions its
creators had in mind. It becomes infrastructure when strangers can use it
for questions the creators never imagined.

### Suggested rapid montage

Show each title for only a few seconds. The joke is the cumulative
disciplinary range, not ridicule of any individual study.

| On-screen hook | Full scientific source | Suggested spoken connection |
| --- | --- | --- |
| **Dancing peanuts in beer** | Pereira and colleagues, 2023.[8] | Fiji can turn up in the physics of an everyday bar snack. |
| **Freddie Mercury** | Herbst and colleagues, 2016.[11] | Scientific image analysis also reaches the acoustics of an extraordinary human voice. |
| **Monkey yodels** | Herbst and colleagues, 2025.[12] | The same broad ecosystem appears in work on New World monkey vocal registers. |
| **Looks that kill** | Miller, 2026.[13] | Fiji even appears in research relating facial metrics to international conflict. |
| **The water bottle flipping experiment** | Nassoy and colleagues, 2024.[14] | A playground challenge becomes a quantitative physics experiment. |
| **Are Pebble Pile Planetesimals Doomed?** | Demirci and colleagues, 2019.[15] | The trail extends from microscopy to the formation of planetary bodies. |
| **Where curling stones collide with rock mechanics** | Leung, Fusseis, and Butler, 2026.[16] | It also reaches the meeting point of sport, material fatigue, and geology. |

Do not spend time explaining every method. Let the sequence widen the room's
idea of where image analysis belongs.

Then say:

> The citation count shows scale. This astonishing variety shows reach.

And:

> Fiji's impact is not one discovery. It is all the discoveries for which
> Fiji quietly got out of the way.

### Optional visual ending

End the montage on a world map or a field map rather than a citation number.
The point is not only how often Fiji was cited, but how far it traveled from
its original context.

### Transition

A platform with that reach eventually has to answer a difficult question:
what happens when its founder leaves?

---

## 7. Should I stay, or should I go?

*Article source: Munpholsri and colleagues, 2026.[9]*

### Speaker notes

Keep this chapter brief, factual, and free of institutional grievance.

In 2015, my answer was that I should go. My career moved into full-time
software engineering, and my relationship with Fiji changed.

This is not the point at which the Fiji story ends. It is the point at which
we discover whether Fiji had truly become shared infrastructure.

> I quit Fiji. Fiji, characteristically, did not quit.

Name the people and groups who carried responsibility forward, especially
the maintainers in Madison and the contributors elsewhere. Show photographs
or a contributor collage if possible. Avoid presenting the community as an
anonymous force.

If Fiji had still depended on me, my departure would have ended it. Shared
ownership turned a departure into a handoff.

### Point to land

> A project has become infrastructure when the founder can leave without
> taking the future with them.

### Alternative

If this title places too much emotional weight on the departure, omit the
chapter entirely or replace it with a lighter farewell title. The important
story is not why one person left. It is why so many other people could
continue.

### Transition

Continuation is not automatic. It consists of thousands of small decisions
by people who accept responsibility.

---

## 8. Dynamic task allocation

*Shortened from Leitner and Dornhaus, 2019.[10]*

### Speaker notes

This paper concerns how workers in social-insect colonies take on new
tasks.[10] Open-source maintainers may recognize the problem.

Projects persist because people repeatedly decide to do work that needs to
be done:

- review a contribution;
- fix an updater;
- maintain a plugin;
- answer a forum question;
- repair compatibility after a dependency changes;
- write or update documentation;
- teach a workshop;
- organize a release;
- preserve old workflows while improving the platform;
- or find institutional support for work that users otherwise never see.

Citation counts do not record these acts. They record some of the science
that became possible afterward.

Shared ownership does not mean that nobody owns the work. It means that
many people feel responsible for it, and that responsibility can move when
people's lives, jobs, and interests change.

### Point to land

> Scientific infrastructure lasts when responsibility can move without
> being dropped.

### Transition

That brings us back to a bug report that accidentally predicted the future.

---

## 9. Fiji won't quit

### Speaker notes

Show the original forum or mailing-list message if you can locate it.
Preserve the wording, date, author, and context accurately.

Originally, "Fiji won't quit" meant that the application would not exit. We
turned it into a running joke.

In hindsight, the bug report became a remarkably accurate description of
the project.

Then make the credits explicit:

> I started Fiji.
>
> Pavel supported it before its impact was obvious.
>
> Many people built it.
>
> A community made it last.

The Fiji paper itself already reflects that collective history through its
sixteen authors.[1] Its position within the longer ImageJ story is equally
important: Fiji could build an ecosystem because ImageJ had already created
an open, extensible foundation.[2]

### Final lines

> Technically, Fiji runs on Java.
>
> In every way that matters today, it runs on community.
>
> Fiji won't quit.

## References

1. Schindelin J, Arganda-Carreras I, Frise E, Kaynig V, Longair M,
   Pietzsch T, Preibisch S, Rueden C, Saalfeld S, Schmid B, Tinevez J-Y,
   White DJ, Hartenstein V, Eliceiri K, Tomancak P, Cardona A. Fiji: an
   open-source platform for biological-image analysis. *Nature Methods*.
   2012;9(7):676-682. <https://doi.org/10.1038/nmeth.2019>

2. Schneider CA, Rasband WS, Eliceiri KW. NIH Image to ImageJ: 25 years of
   image analysis. *Nature Methods*. 2012;9(7):671-675.
   <https://doi.org/10.1038/nmeth.2089>

3. Womack MC, Christensen-Dalsgaard J, Hoke KL. Better late than never:
   effective air-borne hearing of toads delayed due to late maturation of
   the tympanic middle ear structures. *Journal of Experimental Biology*.
   2016;219(20):3246-3252. <https://doi.org/10.1242/jeb.143446>

4. Hakimian H, Ivanov S, Worden AN. What You See versus What You Get: Basics
   of Image Analysis. *Microscopy Today*. 2026;34(4):48-55.
   <https://doi.org/10.1093/mictod/qaag071>

5. Opstad IS. Multidisciplinary biophotonics, open science, and ... plug &
   pray deep learning? *Journal of Biophotonics*. 2022;15(9):e202200024.
   <https://doi.org/10.1002/jbio.202200024>

6. Janeschik M, Schacht MI, Platten F, Turetzek N. It takes Two: Discovery
   of Spider Pax2 Duplicates Indicates Prominent Role in Chelicerate Central
   Nervous System, Eye, as Well as External Sense Organ Precursor Formation
   and Diversification After Neo- and Subfunctionalization. *Frontiers in
   Ecology and Evolution*. 2022;10:810077.
   <https://doi.org/10.3389/fevo.2022.810077>

7. Girstmair J, Zakrzewski A, Lapraz F, Handberg-Thorsager M, Tomancak P,
   Pitrone PG, Simpson F, Telford MJ. Light-sheet microscopy for everyone?
   Experience of building an OpenSPIM to study flatworm development. *BMC
   Developmental Biology*. 2016;16:22.
   <https://doi.org/10.1186/s12861-016-0122-0>

8. Pereira L, Wadsworth FB, Vasseur J, Schmid M, Thivet S, Nuernberg RB,
   Dingwell DB. The physics of dancing peanuts in beer. *Royal Society Open
   Science*. 2023;10(6):230376.
   <https://doi.org/10.1098/rsos.230376>

9. Munpholsri N, Gardiner NM, Waltham NJ, Leahy SM. Should I stay, or should
   I go? Prolonged residency in freshwater leads to greater size-at-age in a
   facultatively catadromous fish. *Estuarine, Coastal and Shelf Science*.
   2026;340:110083. <https://doi.org/10.1016/j.ecss.2026.110083>

10. Leitner N, Dornhaus A. Dynamic task allocation: how and why do social
    insect workers take on new tasks? *Animal Behaviour*. 2019;158:47-63.
    <https://doi.org/10.1016/j.anbehav.2019.09.021>

11. Herbst CT, Hertegard S, Zangger-Borch D, Lindestad P-A. Freddie Mercury:
    acoustic analysis of speaking fundamental frequency, vibrato, and
    subharmonics. *Logopedics Phoniatrics Vocology*. 2016;42(1):29-38.
    <https://doi.org/10.3109/14015439.2016.1156737>

12. Herbst CT, Tokuda IT, Nishimura T, Ternstrom S, Ossio V, Levy M,
    Fitch WT, Dunn JC. 'Monkey yodels': frequency jumps in New World monkey
    vocalizations greatly surpass human vocal register transitions.
    *Philosophical Transactions of the Royal Society B: Biological
    Sciences*. 2025;380(1923):20240005.
    <https://doi.org/10.1098/rstb.2024.0005>

13. Miller R. Looks that kill: Facial metrics and international conflict
    1947-2010. *Politics and the Life Sciences*. Published online August 7,
    2026:1-23. <https://doi.org/10.1017/pls.2026.10024>

14. Nassoy J, Nguyen Huu M, Rembotte L, Trebbia J-B, Nassoy P. The water
    bottle flipping experiment: a quantitative comparison between
    experiments and numerical simulations. *European Journal of Physics*.
    2024;45(6):065001. <https://doi.org/10.1088/1361-6404/ad6e43>

15. Demirci T, Kruss M, Teiser J, Bogdan T, Jungmann F, Schneider N, Wurm G.
    Are Pebble Pile Planetesimals Doomed? *Monthly Notices of the Royal
    Astronomical Society*. 2019;484(2):2779-2785.
    <https://doi.org/10.1093/mnras/stz107>

16. Leung DDV, Fusseis F, Butler IB. Where curling stones collide with rock
    mechanics: cyclical damage accumulation and fatigue in granitoids.
    *Solid Earth*. 2026;17(3):429-452.
    <https://doi.org/10.5194/se-17-429-2026>
