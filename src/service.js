import Service from 'radio.service'
import _ from 'underscore'

/**
 * @class ModalService
 */
const ModalService = Service.extend({

  /**
   * @abstract
   * @method requests
   */
  requests () {
    return {
      open: 'open',
      close: 'close',
      alert: 'alert',
      confirm: 'confirm',
      prompt: 'prompt',
      dialog: 'dialog'
    }
  },

  /**
   * @constructs ModalService
   */
  constructor () {
    this.views = []

    Service.prototype.constructor.apply(this, arguments)
  },

  /**
   * @method open
   * @param {Backbone.View} [view]
   * @returns {Promise}
   */
  open (view, options) {
    let previousView
    return Promise.resolve().then(() => {
      this.trigger('before:open', view, options)
      this._isOpen = true

      previousView = _.last(this.views)
      this.views.push(view)

      return this.render(view, options)
    }).then(() => {
      if (previousView) {
        return this.animateSwap(previousView, view, options)
      } else {
        return this.animateIn(view, options)
      }
    }).then(() => {
      this.trigger('open', view, options)
    })
  },

  /**
   * @method close
   * @param {Backbone.View} [view]
   * @returns {Promise}
   */
  close (view, options) {
    let previousView
    let views

    return Promise.resolve().then(() => {
      if (view) {
        this.trigger('before:close', view, options)
      } else {
        _.map(this.views, view => this.trigger('before:close', view, options))
      }

      this._isOpen = false

      if (view) {
        views = this.views = _.without(this.views, view)
      } else {
        views = this.views
        this.views = []
      }

      previousView = _.last(views)

      if (view && previousView) {
        return this.animateSwap(view, previousView, options)
      } else if (view) {
        return this.animateOut(view, options)
      } else if (previousView) {
        return this.animateOut(previousView, options)
      }
    }).then(() => {
      if (view) {
        return this.remove(view, options)
      } else {
        return Promise.all(_.map(views, view => this.remove(view, options)))
      }
    }).then(() => {
      if (view) {
        this.trigger('close', view, options)
      } else {
        _.map(views, view => this.trigger('close', view, options))
      }
    })
  },

  /**
   * @method alert
   * @param {Object} [options]
   * @returns {Promise}
   */
  alert (options) {
    return new Promise((resolve, reject) => {
      let view = new this.AlertView(options)
      let promise = this.open(view, options)

      this.trigger('before:alert', view, options)

      view.on('confirm cancel', () => {
        promise
          .then(() => this.close(view, options))
          .then(() => this.trigger('alert', null, view, options))
          .then(() => resolve(), reject)
      })
    })
  },

  /**
   * @method confirm
   * @param {Object} [options]
   * @returns {Promise}
   */
  confirm (options) {
    return new Promise((resolve, reject) => {
      let view = new this.ConfirmView(options)
      let promise = this.open(view, options)

      this.trigger('before:confirm', view, options)

      let close = result => {
        promise
          .then(() => this.close(view, options))
          .then(() => this.trigger('confirm', result, view, options))
          .then(() => resolve(result), reject)
      }

      view.on({
        confirm: () => close(true),
        cancel: () => close(false)
      })
    })
  },

  /**
   * @method prompt
   * @returns {Promise}
   */
  prompt (options) {
    return new Promise((resolve, reject) => {
      let view = new this.PromptView(options)
      let promise = this.open(view, options)

      this.trigger('before:prompt', view, options)

      let close = result => {
        promise
          .then(() => this.close(view, options))
          .then(() => this.trigger('prompt', result, view, options))
          .then(() => resolve(result), reject)
      }

      view.on({
        submit: text => close(text),
        cancel: () => close()
      })
    })
  },

  dialog (view, options) {
    if (!view) {
      throw new Error('ModalService: no view option passed to dialog')
    }
    return new Promise((resolve, reject) => {
      let promise = this.open(view, options)

      this.trigger('before:dialog', view, options)

      let close = result => {
        promise
          .then(() => this.close(view, options))
          .then(() => this.trigger('dialog', result, view, options))
          .then(() => resolve(result), reject)
      }

      view.on({
        submit: data => close(data),
        cancel: () => close()
      })
    })
  },

  /**
   * @method isOpen
   * @returns {Boolean}
   */
  isOpen () {
    return !!this._isOpen
  },

  /**
   * @abstract
   * @method render
   */
  render () {},

  /**
   * @abstract
   * @method remove
   */
  remove () {},

  /**
   * @abstract
   * @method animateIn
   */
  animateIn () {},

  /**
   * @abstract
   * @method animateSwap
   */
  animateSwap () {},

  /**
   * @abstract
   * @method animateOut
   */
  animateOut () {}
})

export default ModalService
