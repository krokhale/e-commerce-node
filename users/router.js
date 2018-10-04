'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const {Seller} = require('../models')

const router = express.Router();
const jsonParser = bodyParser.json();

//POST seller - Sign Up
router.post('/register', jsonParser, (req, res) => {
    //Checking for the required fields in the keys
    const requiredFields = ['userName','password']
    const missingField = requiredFields.find(field => !(field in req.body));
    
    // Check for missing field
    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Missing Field',
            location: missingField
        });
    }

    // Check for string validation
    const stringFields = ['userName','password','firstName','lastName'];
    const nonStringField = stringFields.find(field => field in req.body && typeof req.body[field] !== 'string');

    if (nonStringField){
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    // Check for whitespaces 
    // Don't trim credentials (username, password) so users know what's happening
    const explicityTrimmedFields = ['userName', 'password'];
    const nonTrimmedFields = explicityTrimmedFields.find(field => req.body[field].trim() !== req.body[field]);
    if (nonTrimmedFields){
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Cannot start or end with whitespace',
            location: nonTrimmedFields
        });
    }

    // Check for credentials length
    const sizedFields = {
        userName: { min: 1 },
        password: { min: 10, max: 72 }
    };
    const tooSmallField = Object.keys(sizedFields).find(field => {
        'min' in sizedFields[field] && req.body[field].trim().length < sizedFields[field].min 
    })
    const tooLargeField = Object.keys(sizedFields).find(field => {
        'max' in sizedFields[field] && req.body[field].trim().length > sizedFields[field].max
    })

    if (tooSmallField || tooLargeField){
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField ? `Must be atleast ${sizedFields[tooSmallField].min} characters long` : `Must be atleast ${sizedFields[tooLargeField].max} characters long`,
            location: tooSmallField || tooLargeField
        });
    }
    
    let {userName, password, email, firstName = '', lastName = ''} = req.body;
    // userName and Password have to come pre-trimmed from the user, otherwise an error is thrown
    firstName = firstName.trim();
    lastName = lastName.trim();
    
    //Check for unique userName
    return Seller.find({userName}).count().then(count => {
        if (count > 0){
            // Existing username exist
            return Promise.reject({
                code: 422, 
                reason: 'ValidationError',
                message: 'Username already taken',
                location: 'username'
            });
        }
        // If no existing username exist, hash password
        return Seller.hashPassword(password);
    }).then(hash => {
        console.log('Hashing password')
        return Seller.create({
            userName,
            password: hash,
            email,
            firstName,
            lastName
        });
    }).then(user => {
        console.log('Password Hashed. Success')
        return res.status(201).json(user.serialize());
    }).catch(err => {
        if (err.reason === 'ValidationError'){
            return res.status(err.code).json(err);
        }
        res.status(500).json({code: 500, message: 'Internal Server Error'});
    });
});

// Only for testing purposes; to see the output
// router.get('/seller', (req, res) => {
//     return Seller.find().then(users => res.json(users.map(user => user.serialize())))
//     .catch(err => res.status(500).json({code: 500, message: 'Internal server error'}))
// });

// how does this export?
module.exports = {router};