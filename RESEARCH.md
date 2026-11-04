# Adapting Shansometar outside Sofia

Shansometar can link anonymous application identifiers across ranked wishes and simulate a whole applicant pool. The public sources reviewed for Belfast, Washington DC, Leeds and New York City provide historical aggregates or priority-group indicators. An admissions planner can explain rules and compare past outcomes. Personal admission probabilities would additionally need suitable inputs, validation and a locally verified matching model.

| Market | Data and product fit | Implementation implication |
| --- | --- | --- |
| Belfast funded preschool | The Education Authority releases end-of-Stage-2 applications and placements by setting, preference and age group. Settings publish oversubscription rules. | Compare settings across three intakes. Review the rules for each admission year. Some settings explicitly give priority for listing them first. |
| Washington DC PK3/PK4 | My School DC publishes seats and historical waitlist movement. Families see their own live positions after signing in. In 2026 there were 4,416 PK3 and 2,156 PK4 applicants. | A family can compare historical offers by date at several schools. DC instructs applicants to rank in true preference order. A paid or ad-supported tool would compete with the official dashboard and an independent odds calculator. |
| Leeds Reception, England | The council publishes annual primary allocation and cutoff-distance files. England also publishes school-level applications and offers by preference. | Compare last-offered distances under the applicable priority and measurement rules. Primary Reception and preschool nursery admissions are separate processes. |
| NYC pre-K and kindergarten | MySchools already shows previous outcomes by priority group through My Chances. | A cross-school comparison may help. A single-school odds tool would duplicate the official service. |

## Belfast pilot

The 2026/27 Botanic criteria gave first preference priority within the applicable target-age category, ahead of sibling and distance subcriteria. McArthur recognised qualifying sibling or first/only-child circumstances before distance. These examples are specific to that intake. The next intake's criteria are scheduled for 9 December 2026, before the Stage 1 application period of 6–20 January 2027.

## Primary sources and competition

- [Original Shansometar simulator](https://github.com/radoslav1992/shansometar/blob/main/src/scripts/simulator.js)
- [NI Education Authority admissions statistics](https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-support) and [key dates](https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-key-dates)
- [Botanic and McArthur criteria sources](data/criteria.json)
- [My School DC aggregate data and exports](https://www.myschooldc.org/resources/data), [waitlist guidance](https://www.myschooldc.org/how-waitlists-work) and [independent DC odds calculator](https://dcmarylandvirginia.com/dc-school-lottery-odds/)
- [Leeds primary school allocations](https://datamillnorth.org/dataset/primary-school-allocations-e6qpz), [England school-level admissions data](https://explore-education-statistics.service.gov.uk/find-statistics/primary-and-secondary-school-applications-and-offers/2026-27/explore) and [School Signal pricing](https://www.schoolsignal.co.uk/admissions-report)
- [NYC kindergarten priorities and My Chances](https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/kindergarten) and [NYC pre-K program cards](https://www.myschools.nyc/en/schools/pre-k/)
