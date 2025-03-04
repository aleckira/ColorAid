# ColorAid - Chrome Extension for Colorblind Users

ColorAid is a Chrome extension that enhances web content for people with various types of color vision deficiencies. Unlike traditional colorblindness simulators, ColorAid actually improves the browsing experience for colorblind users by making colors more distinguishable.

## Features

- **Colorblindness Presets**: Ready-to-use color adjustments for different types of colorblindness:
  - Protanopia (red-blind)
  - Deuteranopia (green-blind)
  - Tritanopia (blue-blind)
  - Achromatopsia (complete color blindness)

- **Real-time Color Analysis**: Detects and processes colors dynamically as you browse.

- **Fine-tuning Controls**:
  - Adjust contrast and brightness
  - Individual RGB channel enhancement
  - Custom color mapping for problematic colors

- **Dynamic Processing**: Works on a per-element basis rather than applying a global filter.

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "ColorAid" or follow our direct link
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The ColorAid icon should appear in your browser toolbar

## How to Use

1. Click on the ColorAid icon in your browser toolbar to open the extension popup
2. Choose a preset that matches your color vision deficiency
3. Fine-tune the settings as needed:
   - Use the "Adjust" tab to modify contrast, brightness, and color intensities
   - Use the "Customize" tab to create custom color mappings for problematic colors
4. Click "Apply Changes" to apply your settings to the current page
5. Settings are automatically saved for future browsing sessions

## Development

### Project Structure
- `manifest.json`: Extension configuration
- `popup.html/js`: User interface
- `content.js`: Color transformation logic
- `background.js`: Extension background processes

### Building from Source
1. Clone the repository
2. Make any desired modifications
3. Load the extension in Chrome using developer mode

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Special thanks to colorblindness research that provided the transformation matrices
- Feedback from colorblind users that helped improve the experience