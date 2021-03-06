var checker   = require('ember-cli-version-checker');
var clone     = require('clone');
var path      = require('path');
var resolve   = require('resolve');
var Funnel    = require('broccoli-funnel');

module.exports = {
  name: 'ember-cli-babel',

  shouldSetupRegistryInIncluded: function() {
    return !checker.isAbove(this, '0.2.0');
  },

  setupPreprocessorRegistry: function(type, registry) {
    var addon = this;

    registry.add('js', {
      name: 'ember-cli-babel',
      ext: 'js',
      toTree: function(tree) {
        return require('broccoli-babel-transpiler')(tree, getBabelOptions(addon));
      }
    });
  },

  shouldIncludePolyfill: function() {
    var options = getAddonOptions(this);
    return options.includePolyfill === true;
  },

  importPolyfill: function(app) {
    app.import('vendor/browser-polyfill.js', { prepend: true });
  },

  treeFor: function(name) {
    if (name !== 'vendor') { return; }
    if (!this.shouldIncludePolyfill()) { return; }

    // Find babel-core's browser polyfill and use its directory as our vendor tree
    var transpilerRoot = path.dirname(resolve.sync('broccoli-babel-transpiler'));
    var polyfillDir = path.dirname(resolve.sync('babel-core/browser-polyfill', { basedir: transpilerRoot }));

    return new Funnel(polyfillDir, {
      files: ['browser-polyfill.js']
    });
  },

  included: function(app) {
    this._super.included.apply(this, arguments);
    this.app = app;

    if (this.shouldSetupRegistryInIncluded()) {
      this.setupPreprocessorRegistry('parent', app.registry);
    }

    if (this.shouldIncludePolyfill()) {
      this.importPolyfill(app);
    }
  }
};

function getAddonOptions(addonContext) {
  var baseOptions = (addonContext.parent && addonContext.parent.options) || (addonContext.app && addonContext.app.options);
  return baseOptions && baseOptions.babel || {};
}

function getBabelOptions(addonContext) {
  var options = clone(getAddonOptions(addonContext));

  // Ensure modules aren't compiled unless explicitly set to compile
  options.blacklist = options.blacklist || ['es6.modules'];

  // do not enable non-standard transforms
  if (!('nonStandard' in options)) {
    options.nonStandard = false;
  }

  // Don't include the `includePolyfill` flag, since Babel doesn't care
  delete options.includePolyfill;

  if (options.compileModules === true) {
    if (options.blacklist.indexOf('es6.modules') >= 0) {
      options.blacklist.splice(options.blacklist.indexOf('es6.modules'), 1);
    }

    delete options.compileModules;
  } else {
    if (options.blacklist.indexOf('es6.modules') < 0) {
      options.blacklist.push('es6.modules');
    }
  }

  // Ember-CLI inserts its own 'use strict' directive
  options.blacklist.push('useStrict');
  options.highlightCode = false;

  return options;
}
