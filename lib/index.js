'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extensions = exports.AddToNote = exports.CreateNote = undefined;

let fetchNoteFolders = (() => {
  var _ref = _asyncToGenerator(function* () {
    const result = yield (0, _laconaApi.runApplescript)({ script: FETCH_NOTE_FOLDERS_SCRIPT });
    const tabs = _lodash2.default.chain(result || []).map(function (item) {
      return {
        id: item[0],
        name: item[1]
      };
    }).value();

    return tabs;
  });

  return function fetchNoteFolders() {
    return _ref.apply(this, arguments);
  };
})();

let fetchNotes = (() => {
  var _ref2 = _asyncToGenerator(function* () {
    const result = yield (0, _laconaApi.runApplescript)({ script: FETCH_NOTES_SCRIPT });
    const tabs = _lodash2.default.chain(result || []).map(function (item) {
      return {
        id: item[0],
        name: item[1],
        container: item[2]
      };
    }).value();

    return tabs;
  });

  return function fetchNotes() {
    return _ref2.apply(this, arguments);
  };
})();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _elliptical = require('elliptical');

var _laconaApi = require('lacona-api');

var _laconaSourceHelpers = require('lacona-source-helpers');

var _laconaPhrases = require('lacona-phrases');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; } /** @jsx createElement */


const FETCH_NOTE_FOLDERS_SCRIPT = `
  tell application "Notes"
    set info to {}
    repeat with fol in every folder
      set end of info to {fol's id, fol's name}
    end repeat
    info
  end tell
`;

const FETCH_NOTES_SCRIPT = `
  tell application "Notes"
    set info to {}
    repeat with n in every note
      set cont to n's container
      set end of info to {n's id, n's name, cont's name}
    end repeat
    info
  end tell
`;

const NoteFolderSource = (0, _laconaSourceHelpers.onTriggerAfterActivate)(fetchNoteFolders, []);

const NoteSource = (0, _laconaSourceHelpers.onTriggerAfterActivate)(fetchNotes, []);

const NoteFolder = {
  describe({ observe }) {
    const { trigger, data } = observe((0, _elliptical.createElement)(NoteFolderSource, null));
    const items = _lodash2.default.map(data, folder => ({
      text: folder.name,
      value: folder
    }));

    return (0, _elliptical.createElement)(
      'placeholder',
      { argument: 'note folder', suppressEmpty: false },
      (0, _elliptical.createElement)(
        'tap',
        { inbound: trigger },
        (0, _elliptical.createElement)('list', { items: items, limit: 10 })
      )
    );
  }
};

const Note = {
  describe({ observe }) {
    const { trigger, data } = observe((0, _elliptical.createElement)(NoteSource, null));
    const items = _lodash2.default.map(data, note => ({
      text: note.name,
      value: note,
      qualifiers: [note.container],
      annotations: [{ type: 'icon', path: '/Applications/Notes.app' }]
    }));

    return (0, _elliptical.createElement)(
      'placeholder',
      { argument: 'note', suppressEmpty: false },
      (0, _elliptical.createElement)(
        'tap',
        { inbound: trigger },
        (0, _elliptical.createElement)('list', { items: items, limit: 10 })
      )
    );
  }
};

const Title = {
  describe({ props }) {
    return (0, _elliptical.createElement)(
      'placeholder',
      { argument: 'note title' },
      (0, _elliptical.createElement)(_laconaPhrases.String, {
        splitOn: props.splitOn,
        annotation: { type: 'icon', path: '/Applications/Notes.app' },
        limit: 1 })
    );
  }
};

const Line = {
  describe({ props }) {
    return (0, _elliptical.createElement)(_laconaPhrases.String, { splitOn: props.splitOn, label: 'line', limit: 1 });
  }
};

const CreateNote = exports.CreateNote = {
  extends: [_laconaPhrases.Command],

  execute(result) {
    return _asyncToGenerator(function* () {
      const title = result.title.replace('"', '\\"');
      const CREATE_NOTE_SCRIPT = `
      tell application "Notes"
        make new note at folder id "${ result.folder.id }" with properties {name:"${ title }"}
      end tell
    `;

      try {
        yield (0, _laconaApi.runApplescript)({ script: CREATE_NOTE_SCRIPT });
        yield (0, _laconaApi.showNotification)({
          title: 'Notes',
          subtitle: `Successfully created Note in ${ result.folder.name }`,
          content: result.title
        });
      } catch (e) {
        console.error('Failed to create note', e);
        (0, _laconaApi.showNotification)({ title: 'Notes', subtitle: `Failed to create note` });
      }
    })();
  },

  describe() {
    return (0, _elliptical.createElement)(
      'sequence',
      null,
      (0, _elliptical.createElement)('list', { items: ['create note ', 'create '], limit: 1 }),
      (0, _elliptical.createElement)(Title, { splitOn: /\s/, id: 'title' }),
      (0, _elliptical.createElement)('list', { items: [' in ', ' to '], limit: 1 }),
      (0, _elliptical.createElement)(NoteFolder, { id: 'folder' })
    );
  }
};

const AddToNote = exports.AddToNote = {
  extends: [_laconaPhrases.Command],

  execute(result) {
    return _asyncToGenerator(function* () {
      const line = result.line.replace('"', '\\"');

      const APPEND_NOTE_SCRIPT = `
      tell application "Notes"
        set n to note id "${ result.note.id }"
        set newContent to n's body & "<div>${ line }</div>"
        set n's body to newContent
      end tell
    `;

      try {
        yield (0, _laconaApi.runApplescript)({ script: APPEND_NOTE_SCRIPT });
        yield (0, _laconaApi.showNotification)({
          title: 'Notes',
          subtitle: `Successfully added to ${ result.note.name }`,
          content: result.line
        });
      } catch (e) {
        console.error('Failed to add to note', e);
        yield (0, _laconaApi.showNotification)({ title: 'Notes', subtitle: `Failed to add to note` });
      }
    })();
  },

  describe() {
    return (0, _elliptical.createElement)(
      'sequence',
      null,
      (0, _elliptical.createElement)('list', { items: ['add ', 'append '], limit: 1 }),
      (0, _elliptical.createElement)(Line, { splitOn: /\s/, id: 'line' }),
      (0, _elliptical.createElement)('list', { items: [' to ', ' in '], limit: 1 }),
      (0, _elliptical.createElement)(Note, { id: 'note' })
    );
  }
};

const extensions = exports.extensions = [CreateNote, AddToNote];