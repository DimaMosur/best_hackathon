best_hackathon
Inclusive Map
An inclusive urban mapping platform aimed at helping individuals with limited mobility or visual impairments find accessible places in post-war cities.

Why This Matters?
Post-war city reconstruction offers a unique opportunity to not only restore what was lost but to rebuild spaces that are truly inclusive and accessible to everyone. However, much of the infrastructure remains inaccessible for people with disabilities, who face daily barriers that limit their mobility and participation in public life.

Inclusive Map seeks to support the transformation of modern cities into spaces where everyone can feel free, safe, and comfortable — regardless of their physical abilities.

Project Goals
The project aims to build a user-friendly service for searching and reviewing accessible locations based on inclusive criteria such as:

Presence of ramps
Tactile elements
Adapted restrooms
Wheelchair-friendly entrances
Features
Filter Places by Accessibility Filter places based on categories such as suitability for visually impaired users or wheelchair users, using criteria like ramps, tactile paving, accessible entrances, and toilets.

Build Inclusive Routes Automatically generate optimal routes that take accessibility filters into account.

Leave Reviews
Users can rate locations and leave feedback to help others make informed decisions.

Suggest Changes Regular users can suggest improvements to the accessibility ratings of locations.

Support for Users with Special Needs Users with disabilities can register for extended permissions, including editing accessibility data.

Auto-assess Accessibility Levels The system can automatically suggest accessibility levels based on characteristics of locations like cafes, libraries, cinemas, and public transport stations.

Installation
Clone the repository and set up your environment:

git clone git@github.com:DimaMosur/best_hackathon.git
cd best_hackathon
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py migrate
python manage.py runserver
