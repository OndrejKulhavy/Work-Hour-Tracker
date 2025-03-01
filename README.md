# Work Hour Tracker
![GitHub Last Commit](https://img.shields.io/github/last-commit/OndrejKulhavy/Work-Hour-Tracker)
![GitHub Release Date](https://img.shields.io/github/release-date/OndrejKulhavy/Work-Hour-Tracker)


The Work Hour Tracker is a Raycast extension that helps you track your work hours. You can start and end work sessions, add descriptions to your sessions, and store the data in an SQLite database. You can also generate a summary of your work hours for the month.

## Features

- Start a new work session.
- End a work session with an optional description.
- Store work session data in an SQLite database.
- Generate a monthly summary of work hours.

## Commands

### Start Work

Start a new work session.

- **Command**: `Start Work`
- **Description**: Starts a new work session and records the start time.

### End Work

End a work session and add an optional description.

- **Command**: `End Work`
- **Description**: Ends the current work session, records the end time, and allows you to add a description for the session.

## Installation

To install the Work Hour Tracker extension, follow these steps:

1. Install the Raycast CLI if you haven't already:

    ```sh
    npm install -g @raycast/api
    ```

2. Clone the repository:

    ```sh
    git clone https://github.com/your-username/work-hour-tracker.git
    cd work-hour-tracker
    ```

3. Install the dependencies:

    ```sh
    npm install
    ```

4. Run the extension in development mode:

    ```sh
    raycast dev
    ```

## Usage

1. Open Raycast and search for the `Start Work` command to start a new work session.
2. When you finish working, search for the `End Work` command to end the session and add an optional description.
3. To generate a summary of your work hours for the month, use the `Generate Monthly Summary` command (not yet implemented in this version).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any improvements or new features to suggest.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
