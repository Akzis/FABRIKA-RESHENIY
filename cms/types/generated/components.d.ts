import type { Schema, Struct } from '@strapi/strapi';

export interface SharedRow extends Struct.ComponentSchema {
  collectionName: 'components_shared_rows';
  info: {
    description: '\u041F\u0430\u0440\u0430 \u044F\u0440\u043B\u044B\u043A-\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435';
    displayName: 'Row';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedStat extends Struct.ComponentSchema {
  collectionName: 'components_shared_stats';
  info: {
    description: '\u0427\u0438\u0441\u043B\u043E\u0432\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 (\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 + \u043F\u043E\u0434\u043F\u0438\u0441\u044C + \u0430\u043A\u0446\u0435\u043D\u0442)';
    displayName: 'Stat';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<['cyan', 'mint', 'purple']> &
      Schema.Attribute.DefaultTo<'cyan'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.row': SharedRow;
      'shared.stat': SharedStat;
    }
  }
}
