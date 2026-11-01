# Attendify (Firebase edition)

Attendance + academic helper for colleges. React + Vite + Tailwind + Firebase (Auth and Firestore), packaged as an Android app with Capacitor.

- **Students** log in with **college ID + password** (created by management).
- **Teachers** log in with email + password and manage attendance, syllabus, timetable and events for assigned branches and years.
- **Management** provisions teacher and student accounts, assigns each teacher their branches and study years, and manages subjects and timetables.
- Everything is live: when a teacher saves, students see it instantly.

## 1. Firebase setup (10 minutes)

1. Go to https://console.firebase.google.com and create a project.
2. **Build > Authentication > Get started > Sign-in method > Email/Password > Enable.**
3. **Build > Firestore Database > Create database** (production mode, pick a nearby region).
4. **Firestore > Rules**: paste the contents of `firestore.rules` and **Publish**.
5. **Firestore > Data > Start collection** `config`, document ID `management`, field `code` (string) = the 4-digit bootstrap code you chose. Enter that code for the first management signup, then delete `config/management` so it cannot be reused.
6. **Project settings > General > Your apps > Web (</>)**: register an app and copy the config.
7. Copy `.env.example` to `.env` and paste the six values.

## 2. Run it

```bash
npm install
npm run dev
```

Open the local URL. Create the first account using **Management > Sign up** and the code from step 5. After that, sign in as management to create teachers and students, assign teachers their branches and study years, and open **Academic setup** to add subjects and timetables for any branch and semester. Teachers can sign in only after management creates their account.

1. **Management > Teachers**: create teacher logins and select the branches and study years they teach. Study years map to semesters 1–2, 3–4, 5–6 and 7–8.
2. **Management > Students**: add students with their **semester, branch and section**, singly or as a whole class (paste `CSE24-001, Aarav Sharma` per line). Share the shown ID and password.
3. **Management > Academic setup**: add subjects and timetables for any branch and semester. Teachers can also manage subjects and timetables for their assigned classes in **Setup**.
4. **Overview** has the assigned Semester, Branch, Section and **Subject** filters: leave Subject on "All subjects" for overall attendance of an assigned class, or pick one subject.
5. **Syllabus** and **Events**: add units/topics and upcoming sessionals for assigned classes.
6. **Attendance**: pick an assigned semester, branch and section, choose the subject and date, then mark. The **Subject report** toggle shows section averages and students below 75% for an assigned class.

## 3. Build the Android APK

Requirements: Node 18+, JDK 17, Android Studio (installs the Android SDK).

```bash
npm run build
npx cap add android          # first time only
npm run android:sync
npm run android:open         # opens Android Studio
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The file appears at
`android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to a phone and install it (allow "install unknown apps").

Command-line alternative (after `cap add android`):

```bash
cd android && ./gradlew assembleDebug
```

For Play Store: use **Build > Generate Signed Bundle** (AAB) with your own keystore. Keep the keystore safe.

Logo: `public/college-logo.webp` is used in the app and PWA. The Android launcher icon and splash screen use matching resources under `android/app/src/main/res/`; update those resources too when changing the logo.

## 4. Publish on GitHub Pages

Push this project to a GitHub repository on the `main` or `master` branch. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. Add these under **Settings > Secrets and variables > Actions** using the values from your Firebase web app: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`. They can be Actions secrets or variables; Firebase web configuration is included in the public client bundle either way.

The workflow in `.github/workflows/deploy-pages.yml` deploys the site on each push. It fails before deployment and lists any missing Firebase settings. After adding them, rerun the workflow (or push another commit) to rebuild the app. The public URL is shown in the workflow run and under **Settings > Pages**. Protect the service with Firebase Authentication and Firestore security rules, not by treating these values as server-side secrets.

### No Android Studio? Use the web app as an installable app

```bash
npm i -g firebase-tools
firebase login && firebase init hosting   # public dir: dist, single-page app: yes
npm run build && firebase deploy
```
Open the hosted https link on a phone, tap **Add to Home screen**. Or paste the link into https://www.pwabuilder.com to generate an Android package.

## Sharing with every phone

1. Deploy once (`npm run build && firebase deploy`). You get a public link like `https://your-project.web.app`.
2. Send that link to students. It opens on any Android or iPhone browser, no app store needed.
3. **Android:** Chrome menu > Install app (or install your APK).
4. **iPhone:** Safari > Share > Add to Home Screen. (iPhones cannot install APK files.)
5. Students log in with the college ID and password you created for them in the Students tab.

## Code style

The UI is written in standard React JSX (`.jsx` files). The code is dense, so run `npm run format` once (Prettier) to lay it out neatly, or install the recommended VS Code extensions when prompted and enable Format on Save.

## 4. Project structure

```
src/
  main.jsx, App.jsx          entry + auth/data gate
  lib/                       firebase.js, accounts.js (student creation, password change), utils.js, files.js
  store/                     auth.jsx (user + profile), data.jsx (live Firestore data)
  components/                ui.jsx (design system), shell.jsx (navigation)
  pages/                     auth.jsx, account.jsx, student.jsx, teacher.jsx
firestore.rules              server-side security rules
```

## 5. Security model and known limits

- Rules enforce management and teacher permissions on the server: management provisions accounts and assigns teacher branches/years; teachers can only read and manage classes in those assignments. Students can only read their own attendance/progress and cannot write shared data.
- Publish the current `firestore.rules` after updating the app; client-side filters alone do not enforce access control. Create `config/management` with a secret `code` before the first management signup. Existing teacher profiles need management to assign branches and study years. Legacy records with former, missing, or `ALL` branch values need migration to specific branch IDs and semester values before teachers can access them.
- Student logins are Firebase Auth users with a private email (`<id>@students.attendify.app`). No emails are ever sent.
- **Management cannot reset a user's password from the app** (that needs the Firebase Admin SDK / Cloud Functions). If a student forgets it: Firebase Console > Authentication > delete that user, then recreate the student from Management > Students. Students can change their own password under Account.
- Removing a student from Management deletes their profile, progress and attendance; the Auth login remains until deleted in the console.
- Subjects, events, and timetables are branch-scoped; timetables are per semester + branch (not per section).
- Study years map to semesters in pairs: Year 1 = Semesters 1–2, Year 2 = 3–4, Year 3 = 5–6, and Year 4 = 7–8.
- Teacher accounts are not removable from the app (use the console).
- Not yet tested on a real device by the author of this scaffold. Run through the flow once before presenting.
