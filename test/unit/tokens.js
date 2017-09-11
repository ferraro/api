var should = require('should')
var sinon = require('sinon')
var request = require('supertest')
var uuid = require('uuid')
var config = require(__dirname + '/../../config')
var Connection = require(__dirname + '/../../dadi/lib/model/connection')
var tokens = require(__dirname + '/../../dadi/lib/auth/tokens')
var tokenStore = require(__dirname + '/../../dadi/lib/auth/tokenStore')
var acceptanceTestHelper = require(__dirname + '/../acceptance/help')

var clientCollectionName = config.get('auth.clientCollection')

describe('Tokens', function () {
  before(function (done) {
    var dbOptions = { auth: true, database: config.get('auth.database'), collection: clientCollectionName }
    var conn = Connection(dbOptions, null, config.get('auth.datastore'))

    setTimeout(function () {
      if (conn.datastore.dropDatabase) {
        conn.datastore.dropDatabase().then(() => {
          done()
        }).catch((err) => {
          console.log(err)
          done(err)
        })
      } else {
        done()
      }
    }, 500)
  })

  after(function (done) {
    // acceptanceTestHelper.removeTestClients(done);
    done()
  })

  it('should export generate function', function (done) {
    tokens.generate.should.be.Function
    done()
  })

  it('should export validate function', function (done) {
    tokens.validate.should.be.Function
    done()
  })

  it('should export a tokenStore', function (done) {
    tokens.tokenStore.should.be.instanceOf(tokenStore.TokenStore)
    done()
  })

  describe('generate', function () {
    before(function (done) {
      var dbOptions = { auth: true, database: config.get('auth.database'), collection: clientCollectionName }
      var conn = Connection(dbOptions, null, config.get('auth.datastore'))

      var store = tokenStore()

      setTimeout(() => {
        conn.datastore.insert({
          data: {
            clientId: 'test123',
            secret: 'superSecret'
          },
          collection: clientCollectionName,
          schema: store.schema.fields,
          settings: store.schema.settings
        }).then(() => {
          done()}
        )
      }, 500)
    })

    it('should check the generated token doesn\'t already exist before returning token', function (done) {
        // set new tokens
      tokens.tokenStore.set('test123', {id: 'test123'}).then(doc => {
        return tokens.tokenStore.set('731a3bac-7872-481c-9069-fa223b318f6d', {id: 'test123'})
      }).then(doc => {
        var uuidStub = sinon.stub(uuid, 'v4')
        uuidStub.onCall(0).returns('test123') // Call 0: token already exists
        uuidStub.onCall(1).returns('731a3bac-7872-481c-9069-fa223b318f6d') // Call 1: token already exists
        uuidStub.returns('731a3bac-7872-481c-9069-fa223b318f6e') // Call 2: token does not exist

        var req = { body: { clientId: 'test123', secret: 'superSecret' } }
        var res = {
          setHeader: function () {},
          end: function (data) {
            data = JSON.parse(data)

            data.accessToken.should.eql('731a3bac-7872-481c-9069-fa223b318f6e')
            uuid.v4.restore()
            uuidStub.callCount.should.be.above(1)

            done()
          }
        }

        tokens.generate(req, res, err => {
          done(err)
        })
      }).catch(err => done(err))
    })
  })

  describe('validate', function () {
    before(function (done) {
      var dbOptions = { auth: true, database: config.get('auth.database'), collection: clientCollectionName }
      var conn = Connection(dbOptions, null, config.get('auth.datastore'))

      var store = tokenStore()

      setTimeout(function () {
        conn.datastore.insert({
          data: {
            clientId: 'test123',
            secret: 'superSecret'
          },
          collection: clientCollectionName,
          schema: store.schema.fields,
          settings: store.schema.settings
        }).then(() => {
          done()}
        )
      }, 500)
    })

    it('should return object for valid token', function (done) {
      var req = {
        body: {
          clientId: 'test123',
          secret: 'superSecret'
        }
      }

      var res = {
        setHeader: function () {},
        end: function (data) {
          data = JSON.parse(data)

          should.exist(data.accessToken)
          data.tokenType.should.equal('Bearer')
          done()
        }
      }

      tokens.generate(req, res)
    })
  })
})
