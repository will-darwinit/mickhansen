import Sequelize from 'sequelize';
import {
  GraphQLList
} from 'graphql';

module.exports = function (target, options) {
  var resolver;

  options = options || {};
  if (options.include === undefined) options.include = true;

  if (target instanceof Sequelize.Model) {
    let targetAttributes = Object.keys(target.rawAttributes);

    resolver = function(source, args, root, ast, type) {
      let selections = ast.selectionSet.selections.map(selection => selection.name.value);
      let attributes = selections;
      let include = [];
      let $type = type.ofType || type;

      if (!~attributes.indexOf(target.primaryKeyAttribute)) {
        attributes.push(target.primaryKeyAttribute);
      }

      selections.forEach(function (selection) {
        let association = $type._fields[selection] && $type._fields[selection].resolve && $type._fields[selection].resolve.$association;

        if (association) {
          if (options.include) {
            include.push(association);
          } else if (association.associationType === 'BelongsTo') {
            attributes.push(association.foreignKey);
          }
        }
      });

      attributes = attributes.filter(attribute => ~targetAttributes.indexOf(attribute));

      let findOptions = {
        where: args,
        include: include,
        attributes: attributes
      };

      return target[type instanceof GraphQLList ? 'findAll' : 'findOne'](findOptions);
    };
  }

  if (target instanceof require('sequelize/lib/associations/base')) {
    resolver = function(source) {
      return source.get(target.as) || source[target.accessors.get]({

      });
    };

    resolver.$association = target;
  }

  return resolver;
};
