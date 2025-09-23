# Embeddable Donate Widget

Drop FundFlow's donate widget on any website with a single script tag.

## Quick Start

Add this script tag anywhere on your website:

```html
<script 
  src="https://uobgytlnzmngwxmweufu.functions.supabase.co/embed" 
  data-slug="YOUR-CAMPAIGN-SLUG" 
  data-width="100%" 
  data-amounts="2500,5000,10000,25000" 
  data-currency="USD">
</script>
```

## Configuration Options

| Attribute | Description | Default | Example |
|-----------|-------------|---------|---------|
| `data-slug` | **Required** - Campaign slug/ID | - | `my-campaign` |
| `data-width` | Widget width | `100%` | `400px`, `50%` |
| `data-amounts` | Preset donation amounts (cents) | `2500,5000,10000,25000` | `1000,2000,5000` |
| `data-currency` | Display currency | `USD` | `USD`, `EUR` |

## Examples

### Basic Widget
```html
<script src="https://uobgytlnzmngwxmweufu.functions.supabase.co/embed" data-slug="help-families"></script>
```

### Custom Amounts
```html
<script 
  src="https://uobgytlnzmngwxmweufu.functions.supabase.co/embed" 
  data-slug="disaster-relief"
  data-amounts="500,1000,2500,5000"
  data-width="400px">
</script>
```

### In a Container
```html
<div style="max-width: 500px; margin: 0 auto;">
  <h3>Support Our Cause</h3>
  <script 
    src="https://uobgytlnzmngwxmweufu.functions.supabase.co/embed" 
    data-slug="education-fund"
    data-width="100%">
  </script>
</div>
```

## Features

- **Responsive**: Automatically adapts to container width
- **Auto-resize**: Height adjusts based on content
- **Secure**: Payments processed through Stripe
- **Rate limited**: Built-in abuse protection
- **Mobile-friendly**: Works on all devices

## Technical Details

The widget loads as an iframe and communicates with the parent page to:
- Automatically resize based on content height
- Maintain security boundaries
- Support payment flows

Minimum width: 280px  
Default height: 420px (adjusts automatically)

## Support

For technical support or custom integrations, contact the FundFlow team.