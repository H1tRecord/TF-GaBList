# TaskFlux Greenlist and Blacklist Manager

A Chrome extension to manage greenlist and blacklist for TaskFlux subreddits.

## Installation

1. Download or clone this repository to your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **Load unpacked**
5. Select the folder containing the extension files
6. The extension icon will appear in your browser toolbar

## Usage

1. Click the extension icon in your toolbar to open the popup
2. **Greenlist Tab**: Add subreddits you prefer (e.g., `r/funny, r/pics`)
3. **Blacklist Tab**: Add subreddits you want to avoid
4. Click **Save Changes** to apply

### Features

- **Toggle Lists**: Enable/disable greenlist or blacklist independently
- **Remove Duplicates**: Clean up duplicate entries with one click
- **Clear All**: Remove all entries from a list
- **Visual Indicators**: Tasks are highlighted based on list status
  - 🟢 Green border = Preferred subreddit
  - 🔴 Red border = Blacklisted subreddit (claim disabled)

### Notes

- Subreddits in both lists will be blocked from saving
- The extension only works on `taskflux.net`
- Changes apply immediately after saving

## Credits

Made by [H1tRecord](https://github.com/H1tRecord)
