/** @jsx createElement */
import _ from 'lodash'
import { createElement } from 'elliptical'
import { runApplescript, showNotification } from 'lacona-api'
import { onTriggerAfterActivate } from 'lacona-source-helpers'
import { Command, String } from 'lacona-phrases'

const FETCH_NOTE_FOLDERS_SCRIPT = `
  tell application "Notes"
    set info to {}
    repeat with fol in every folder
      set end of info to {fol's id, fol's name}
    end repeat
    info
  end tell
`

const FETCH_NOTES_SCRIPT = `
  tell application "Notes"
    set info to {}
    repeat with n in every note
      set cont to n's container
      set end of info to {n's id, n's name, cont's name}
    end repeat
    info
  end tell
`

async function fetchNoteFolders () {
  const result = await runApplescript({script: FETCH_NOTE_FOLDERS_SCRIPT})
  const tabs = _.chain(result || [])
    .map(item => ({
      id: item[0],
      name: item[1]
    }))
    .value()

  return tabs
}

const NoteFolderSource = onTriggerAfterActivate(fetchNoteFolders, [])

async function fetchNotes () {
  const result = await runApplescript({script: FETCH_NOTES_SCRIPT})
  const tabs = _.chain(result || [])
    .map(item => ({
      id: item[0],
      name: item[1],
      container: item[2]
    }))
    .value()

  return tabs
}
const NoteSource = onTriggerAfterActivate(fetchNotes, [])

const NoteFolder = {
  describe ({observe}) {
    const {trigger, data} = observe(<NoteFolderSource />)
    const items = _.map(data, folder => ({
      text: folder.name,
      value: folder
    }))

    return (
      <placeholder argument='note folder' suppressEmpty={false}>
        <tap inbound={trigger}>
          <list items={items} limit={10} />
        </tap>
      </placeholder>
    )
  }
}

const Note = {
  describe ({observe}) {
    const {trigger, data} = observe(<NoteSource />)
    const items = _.map(data, note => ({
      text: note.name,
      value: note,
      qualifiers: [note.container],
      annotations: [{type: 'icon', path: '/Applications/Notes.app'}]
    }))

    return (
      <placeholder argument='note' suppressEmpty={false}>
        <tap inbound={trigger}>
          <list items={items} limit={10} />
        </tap>
      </placeholder>
    )
  }
}

const Title = {
  describe ({props}) {
    return (
      <placeholder argument='note'>
        <String
          splitOn={props.splitOn}
          annotation={{type: 'icon', path: '/Applications/Notes.app'}}
          limit={1} />
      </placeholder>
    )
  }
}

const Line = {
  describe ({props}) {
    return (
      <String splitOn={props.splitOn} label='line' limit={1} />
    )
  }
}

export const CreateNote = {
  extends: [Command],

  async execute (result) {
    const title = result.title.replace('"', '\\"')
    const CREATE_NOTE_SCRIPT = `
      tell application "Notes"
        make new note at folder id "${result.folder.id}" with properties {name:"${title}"}
      end tell
    `

    try {
      await runApplescript({script: CREATE_NOTE_SCRIPT})
      await showNotification({
        title: 'Notes',
        subtitle: `Successfully created Note in ${result.folder.name}`,
        content: result.title
      })
    } catch (e) {
      console.error('Failed to create note', e)
      showNotification({title: 'Notes', subtitle: `Failed to create note`})
    }

  },

  describe () {
    return (
      <sequence>
        <list items={['create note ', 'create ']} limit={1} />
        <Title splitOn={/\s/} id='title' />
        <list items={[' in ', ' to ']} limit={1} />
        <NoteFolder id='folder' />
      </sequence>
    )
  }
}

export const AddToNote = {
  extends: [Command],

  async execute (result) {
    const line = result.line.replace('"', '\\"')

    const APPEND_NOTE_SCRIPT = `
      tell application "Notes"
        set n to note id "${result.note.id}"
        set newContent to n's body & "<div>${line}</div>"
        set n's body to newContent
      end tell
    `

    try {
      await runApplescript({script: APPEND_NOTE_SCRIPT})
      await showNotification({
        title: 'Notes',
        subtitle: `Successfully added to ${result.note.name}`,
        content: result.line
      })
    } catch (e) {
      console.error('Failed to add to note', e)
      await showNotification({title: 'Notes', subtitle: `Failed to add to note`})
    }
  },

  describe () {
    return (
      <sequence>
        <list items={['add ', 'append ']} limit={1} />
        <Line splitOn={/\s/} id='line' />
        <list items={[' to ', ' in ']} limit={1} />
        <Note id='note' />
      </sequence>
    )
  }
}

export const extensions = [CreateNote, AddToNote]
