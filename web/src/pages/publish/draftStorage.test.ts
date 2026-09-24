import { beforeEach, describe, expect, it } from 'vitest'
import {
  getPublicationDraftKey,
  readPublicationDraft,
  removePublicationDraft,
  savePublicationDraft,
} from './draftStorage'

beforeEach(() => localStorage.clear())

describe('publication draft storage isolation', () => {
  it('keeps drafts isolated by authenticated user', () => {
    savePublicationDraft('owner-a', { title: 'Borrador A' })

    expect(readPublicationDraft('owner-a')).toEqual({ title: 'Borrador A' })
    expect(readPublicationDraft('owner-b')).toBeNull()
  })

  it('migrates the legacy unscoped draft to the current user once', () => {
    localStorage.setItem('cubitat_publish_draft', JSON.stringify({ title: 'Anterior' }))

    expect(readPublicationDraft('owner-a')).toEqual({ title: 'Anterior' })
    expect(localStorage.getItem('cubitat_publish_draft')).toBeNull()
    expect(localStorage.getItem(getPublicationDraftKey('owner-a'))).not.toBeNull()
  })

  it('discards a corrupted scoped draft without blocking the form', () => {
    localStorage.setItem(getPublicationDraftKey('owner-a'), '{not-json')

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(localStorage.getItem(getPublicationDraftKey('owner-a'))).toBeNull()
  })

  it('discards a corrupted legacy draft without migrating it', () => {
    localStorage.setItem('cubitat_publish_draft', '{not-json')

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(localStorage.getItem('cubitat_publish_draft')).toBeNull()
    expect(localStorage.getItem(getPublicationDraftKey('owner-a'))).toBeNull()
  })

  it('removes only the requested user draft', () => {
    savePublicationDraft('owner-a', { title: 'A' })
    savePublicationDraft('owner-b', { title: 'B' })

    removePublicationDraft('owner-a')

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(readPublicationDraft('owner-b')).toEqual({ title: 'B' })
  })
})
