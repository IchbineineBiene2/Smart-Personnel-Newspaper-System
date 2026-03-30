const fs = require('fs');
const path = 'app/news/[id].tsx';
let content = fs.readFileSync(path, 'utf8');

// relatedList'ten sonra yeni stileri ekle
const newStyles = `
    actionBar: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
    },
    actionButtonText: {
      fontSize: 18,
    },
    actionButtonLabel: {
      fontSize: 12,
      fontWeight: '600',
    },`;

content = content.replace(/paddingBottom: Spacing\.sm,\s*\},\s*\}\);/, `paddingBottom: Spacing.sm,
    },${newStyles}
  });`);

fs.writeFileSync(path, content, 'utf8');
console.log('✅ Share button styles added!');
