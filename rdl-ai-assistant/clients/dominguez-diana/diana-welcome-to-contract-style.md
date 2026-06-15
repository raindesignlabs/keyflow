# Diana's Real Estate Contract Timeline & Contacts Specification

## Visual Style & Branding
- **Theme Name**: Editorial Estate
- **Aesthetic**: Minimalist, high-end editorial, clean hierarchy.
- **Typography**: 
  - Script/Accents: Elegant serif/script (e.g., Bodoni Moda) for "Congratulations" and section headers.
  - Body/Data: Clean sans-serif (e.g., Inter or Montserrat) for high legibility in data tables.
- **Color Palette**:
  - Primary Background: #FFFFFF (White)
  - Secondary Background: #F9F9F9 (Light Gray) for section blocks.
  - Text/Lines: #000000 (Black) or Deep Charcoal.
  - Accents: Subtle gray dividers and light-gray background containers.

## Layout Structure

### 1. Header (Status & Property Summary)
- **Status Bar**: A full-width light gray bar at the top containing a script "Congratulations" on the left and a sans-serif "we are officially under contract!!" on the right.
- **Property Details Row**: Three equal-width columns separated by vertical dividers.
  - Column 1: Property Icon + Address (e.g., 9716 Wild Mountain Dr.)
  - Column 2: Dollar Icon + Purchase Price (e.g., $335,000)
  - Column 3: Bill Icon + Earnest Money (e.g., $0)
  - Styling: Icon above bold label, value below in clean sans-serif.

### 2. Main Body (Two-Column Grid)
- **Left Column: The Timeline**:
  - Header: Script "Here's the Timeline"
  - Container: Light gray rounded-corner box.
  - Content: Key-Value pairs with keys left-aligned and values right-aligned.
  - Fields: Effective Date, Earnest Money Due, Inspection Date, Inspection Period Ends, Appraisal Date, Final Walk-Through, Closing Date.
- **Right Column: Contacts**:
  - Header: Script "Contacts"
  - Container: Light gray rounded-corner box.
  - Content: Vertically stacked contact blocks.
  - Sections: Title Company, Lender, Home Inspections, Survey Company, Home Insurance.
  - Detail: Each block includes Company Name, Address (if applicable), Contact Name, Phone, and Email.

### 3. Footer (Notes & Agent Branding)
- **Notes Section**: 
  - Header: Script "Notes"
  - Content: Multi-paragraph text block on a light gray background.
- **Agent Profile**:
  - Layout: Two columns.
  - Left: Professional circular or styled headshot.
  - Right: Agent Name (Bold Serif), Brokerage Logo, Phone, Email, and Website.
  - Closing Statement: "Please let me know if you have any questions!" centered above the branding.

## Implementation Rules for AI Agents
1. **Vertical Dividers**: Use subtle 1px lines to separate the top property details.
2. **Alignment**: Ensure all labels in the Timeline are uppercase and values are consistent in format (e.g., dates as OCT 25, 2025).
3. **Hierarchy**: Headers must use the script font to create the "Editorial" feel, while all transactional data must use the high-contrast sans-serif font.
4. **Spacing**: Maintain generous whitespace between sections to prevent the document from feeling cluttered.