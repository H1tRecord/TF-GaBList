# TaskFlux Greenlist and Blacklist Manager

A Chrome extension to manage greenlist and blacklist for TaskFlux subreddits.

## Installation

1. Download the source.zip file
2. Extract the files
3. Open your browser’s extensions page:
   * Chrome / Brave / Opera: `chrome://extensions/`
   * Microsoft Edge: `edge://extensions/`
   * Firefox: `about:addons`
4. Enable **Developer Mode**:
   * For Chrome, Edge, Brave, and Opera: Toggle **Developer mode** (usually in the top-right corner)
   * For Firefox: Open **Extensions** → Click the gear icon ⚙️ → Select **Debug Add-ons**
5. Load the extension:
   * Chrome / Edge / Brave / Opera:
     * Click **Load unpacked**
     * Select the folder containing the extension files
   * Firefox (Temporary Installation):
     * Click **Load Temporary Add-on**
     * Select `manifest.json` from the extension folder
6. The extension icon will appear in your browser toolbar (you may need to pin it)

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
