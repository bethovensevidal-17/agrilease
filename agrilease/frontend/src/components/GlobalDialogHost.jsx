
import React, { Component } from 'react';

export default class GlobalDialogHost extends Component {
  state = {
    dialog: null,
    input: '',
  };

  componentDidMount() {
    window.agrileaseDialog = {
      confirm: (message, options = {}) => this.openDialog('confirm', message, options),
      alert: (message, options = {}) => this.openDialog('alert', message, options),
      prompt: (message, options = {}) => this.openDialog('prompt', message, options),
    };
  }

  componentWillUnmount() {
    delete window.agrileaseDialog;

    if (this.state.dialog?.resolve) {
      this.state.dialog.resolve(null);
    }
  }

  openDialog = (type, message, options = {}) => {
    return new Promise(resolve => {
      this.setState({
        input: options.defaultValue || '',
        dialog: {
          type,
          message,
          title:
            options.title ||
            (type === 'confirm'
              ? 'Confirm action'
              : type === 'alert'
              ? 'Notice'
              : 'Additional information'),
          confirmText:
            options.confirmText ||
            (type === 'alert' ? 'OK' : type === 'prompt' ? 'Submit' : 'Confirm'),
          placeholder: options.placeholder || '',
          resolve,
        },
      });
    });
  };

  finish = value => {
    const dialog = this.state.dialog;

    if (!dialog) return;

    this.setState({ dialog: null }, () => {
      dialog.resolve?.(value);
    });
  };

  render() {
    const { dialog, input } = this.state;

    if (!dialog) return null;

    return (
      <div
        className="al-dialog-backdrop"
        role="presentation"
        onMouseDown={event => {
          if (event.target === event.currentTarget) {
            this.finish(dialog.type === 'prompt' ? null : false);
          }
        }}
      >
        <section
          className="al-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="al-dialog-title"
        >
          <div className="al-dialog-mark">A</div>

          <h2 id="al-dialog-title">{dialog.title}</h2>
          <p>{dialog.message}</p>

          {dialog.type === 'prompt' && (
            <textarea
              autoFocus
              value={input}
              onChange={event => this.setState({ input: event.target.value })}
              placeholder={dialog.placeholder}
              rows={4}
            />
          )}

          <div className="al-dialog-actions">
            {dialog.type !== 'alert' && (
              <button
                type="button"
                className="al-dialog-cancel"
                onClick={() =>
                  this.finish(dialog.type === 'prompt' ? null : false)
                }
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              className="al-dialog-confirm"
              onClick={() =>
                this.finish(dialog.type === 'prompt' ? input : true)
              }
              autoFocus={dialog.type !== 'prompt'}
            >
              {dialog.confirmText}
            </button>
          </div>
        </section>
      </div>
    );
  }
}
