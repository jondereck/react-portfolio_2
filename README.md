# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# Initializing GitHub
1. Open a command prompt or terminal with administrator privileges.

2. Navigate to your project directory:
   - Use the command `cd <project-directory>` to change to your project directory.
   - Replace `<project-directory>` with the actual directory path where your project is located.

3. Check the status of your Git repository:
   - Use the command `git status` to see the current status of your repository.
   - This will show any untracked or modified files.

4. Stage the changes:
   - Use the command `git add .` to stage all modified and untracked files.
   - This adds all changes to the staging area for the next commit.

5. Commit the changes:
   - Use the command `git commit -m 'project-done'` to create a new commit.
   - Replace `'project-done'` with a meaningful commit message describing your project.

6. Create a new repository on GitHub:
   - Go to https://github.com/new to create a new repository.
   - Provide a name for your repository and any desired settings.
   - Leave the repository empty without initializing it with a README file.

7. Copy the "push an existing repository from the command line" instructions:
   - From the newly created repository's page, copy the commands under "push an existing repository from the command line".

8. Add the remote repository:
   - In the command prompt or terminal, use the command copied from GitHub to add the remote repository.
   - For example: `git remote add origin https://github.com/jondereck/react-portfolio_2.git`.

9. Rename the main branch (optional):
   - Use the command `git branch -M main` to rename the branch to `main`.
   - This step is optional, and you can keep the default branch name if desired.

10. Push the changes to GitHub:
    - Use the command `git push -u origin main` to push the commits to the remote repository.
    - This uploads your local code to GitHub.

Once you've followed these steps, your local code will be initialized and pushed to GitHub, creating a new repository.



# Updating Code on GitHub 
1. Stage the changes:
   - Use the command `git add <file>` to stage modified files or new files.
   - For example, to stage a file named `example.js`, use: `git add example.js`.
   - To stage all modified files, use: `git add .`.

2. Commit the changes:
   - Use the command `git commit -m "<commit message>"` to create a new commit.
   - Provide a meaningful commit message that describes the updates made.
   - For example: `git commit -m "Update example.js with new feature"`.

3. Push the changes:
   - Use the command `git push <remote> <branch>` to upload the committed changes to GitHub.
   - Specify the remote repository and branch to push to.
   - For example: `git push origin main` pushes changes to the `main` branch of the `origin` remote.

Once you've followed these steps, your local code changes will be updated on GitHub. Others can then fetch and pull these updates from the repository.
